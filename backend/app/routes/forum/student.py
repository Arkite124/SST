from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import aliased, joinedload
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from data.postgresDB import SessionLocal
from models import ReadingForumPosts, Users
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from app.routes.login.login import profile_data, get_current_user

load_dotenv()  # .env 파일 자동 로드

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#  사용자 닉네임 확인용
class UserNickname(BaseModel):
    nickname: str

    class Config:
        from_attributes = True

# ✅ 글 생성 요청용
class ReadingForumPostCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None  # 부모글 ID (없으면 부모글, 있으면 댓글/대댓글)
    title: Optional[str] = None # 댓글은 제목이 없기 때문에 게시글에서 예외처리 추가
    content: str
    book_title: Optional[str] = None       # ✅ ORM의 book_title 반영
    discussion_tags: Optional[str] = None  # ✅ ORM의 discussion_tags 반영

# ✅ 글 수정 요청용
class ReadingForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    book_title: Optional[str] = None
    discussion_tags: Optional[str] = None

# ✅ 글 조회 응답용 (User 정보 + children 포함)
class ReadingForumPostRead(BaseModel):
    id: int
    user_id: int
    parent_id: Optional[int] = None
    title: Optional[str] = None
    content: str
    book_title: Optional[str]
    discussion_tags: Optional[str]
    created_at: datetime
    updated_at: datetime
    children: List["ReadingForumPostRead"] = Field(default_factory=list)  # ✅ 자기참조 구조
    user: UserNickname
    comment_count: int = 0  # 댓글 개수 (추가 필드)

    class Config:
        from_attributes = True

# ForwardRef 갱신
ReadingForumPostRead.model_rebuild()

class ReadingForumPostListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReadingForumPostRead]


# ✅ 대댓글(2 depth)까지 트리 형태로 조회 (최신순 DESC)
def get_children_level2(db: Session, parent_id: int) -> List[ReadingForumPostRead]:
    # 1 depth: parent_id == 부모글/댓글 ID
    level1 = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.parent_id == parent_id)
        .options(joinedload(ReadingForumPosts.user))
        .order_by(ReadingForumPosts.created_at.desc())
        .all()
    )

    result: List[ReadingForumPostRead] = []
    for comment in level1:
        # 2 depth: 해당 댓글의 자식들(대댓글)
        level2 = (
            db.query(ReadingForumPosts)
            .filter(ReadingForumPosts.parent_id == comment.id)
            .options(joinedload(ReadingForumPosts.user))
            .order_by(ReadingForumPosts.created_at.desc())
            .all()
        )

        result.append(
            ReadingForumPostRead(
                id=comment.id,
                parent_id=comment.parent_id,
                title=comment.title,
                content=comment.content,
                book_title=comment.book_title,
                discussion_tags=comment.discussion_tags,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                user=comment.user,
                comment_count=len(level2),
                children=[
                    ReadingForumPostRead(
                        id=reply.id,
                        user_id=reply.user_id,  # ⬅ 추가!!
                        parent_id=reply.parent_id,
                        title=reply.title,
                        content=reply.content,
                        book_title=reply.book_title,
                        discussion_tags=reply.discussion_tags,
                        created_at=reply.created_at,
                        updated_at=reply.updated_at,
                        user=reply.user,
                        comment_count=0,
                        children=[],
                    )
                    for reply in level2
                ],
            )
        )
    return result


# ✅ 부모 게시글 목록 + 댓글 수
@router.get(
    "/posts",
    response_model=ReadingForumPostListResponse,
    summary="독서토론 게시글 목록 조회",
    description="""
독서토론 게시판의 **부모 게시글 목록**을 페이지네이션 형태로 조회합니다.

### 주요 기능
- `parent_id`가 NULL인 부모 글만 조회
- 페이지 번호(page), 페이지 크기(size)를 통한 페이지네이션 처리
- 게시글별 **댓글 개수(comment_count)** 포함 (직접 자식 수 기준)
- 작성자 정보(UserNickname) 포함

### Query Parameters
- `page`: 페이지 번호 (기본값: 1)
- `size`: 한 페이지의 게시글 수 (기본값: 10)

### Response Fields
- `total`: 전체 부모 게시글 수
- `page`: 현재 페이지
- `size`: 페이지당 게시글 수
- `items`: 게시글 목록 (ReadingForumPostRead)
"""
)
def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=50, description="한 페이지당 게시글 수"),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    comment = aliased(ReadingForumPosts)

    # ✅ 총 부모 게시글 수
    total = (
        db.query(func.count(ReadingForumPosts.id))
        .filter(ReadingForumPosts.parent_id.is_(None))
        .scalar()
    )

    # ✅ 부모 게시글 + 댓글 수 subquery
    subq = (
        db.query(
            ReadingForumPosts.id.label("post_id"),
            func.count(comment.id).label("comment_count"),
        )
        .outerjoin(comment, comment.parent_id == ReadingForumPosts.id)
        .filter(ReadingForumPosts.parent_id.is_(None))
        .group_by(ReadingForumPosts.id)
        .subquery()
    )

    query = (
        db.query(ReadingForumPosts, subq.c.comment_count)
        .join(subq, subq.c.post_id == ReadingForumPosts.id)
        .options(joinedload(ReadingForumPosts.user))
        .order_by(ReadingForumPosts.created_at.desc())
        .offset(offset)
        .limit(size)
    )

    results = query.all()

    items = [
        ReadingForumPostRead(
            id=post.id,
            title=post.title,
            user_id=post.user_id,
            parent_id=post.parent_id,
            content=post.content,
            book_title=post.book_title,
            discussion_tags=post.discussion_tags,
            created_at=post.created_at,
            updated_at=post.updated_at,
            comment_count=comment_count,
            user=post.user, # 유저객체 가져옴
        )
        for post, comment_count in results
    ]

    return {"total": total, "page": page, "size": size, "items": items}

# ✅ 게시글 상세 + 댓글/대댓글(2 depth) 포함
@router.get(
    "/posts/{list_id}",
    response_model=ReadingForumPostRead,
    summary="독서토론 게시글 상세 조회",
    description="""
특정 독서토론 게시글을 ID로 조회합니다.

### 주요 기능
- 게시글 데이터 + 작성자 정보 포함
- 해당 게시글에 달린 **댓글(1 depth)** + **대댓글(2 depth)** 트리 구조 포함
- 존재하지 않는 게시물 ID 요청 시 404 오류 반환
"""
)
def get_post(list_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(ReadingForumPosts)
        .options(joinedload(ReadingForumPosts.user))
        .filter(ReadingForumPosts.id == list_id)
        .first()
    )
    if not post:
        raise HTTPException(
            status_code=404,
            detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."},
        )

    children = get_children_level2(db, post.id)

    return ReadingForumPostRead(
        id=post.id,
        user_id=post.user_id,
        parent_id=post.parent_id,
        title=post.title,
        content=post.content,
        book_title=post.book_title,
        discussion_tags=post.discussion_tags,
        created_at=post.created_at,
        updated_at=post.updated_at,
        user=post.user,
        comment_count=len(children),
        children=children,
    )


# ✅ 게시글 검색 (부모글만, 최신순)
@router.get(
    "/posts/search",
    response_model=List[ReadingForumPostRead],
    summary="독서토론 게시글 검색",
    description="""
지정한 키워드가 포함된 독서토론 부모 게시글을 검색합니다.

### 검색 대상
- 제목(title)
- 내용(content)
- 책 제목(book_title)

### 주요 기능
- `parent_id IS NULL` 인 **부모 게시글만 검색**
- 중복 제거
- `created_at` 기준 최신순 정렬
"""
)
def search_reading_posts(
    word: str = Query(..., description="제목/내용/책제목에 포함될 검색어"),
    db: Session = Depends(get_db),
):
    base_query = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.parent_id.is_(None))
        .options(joinedload(ReadingForumPosts.user))
    )

    posts = (
        base_query.filter(
            or_(
                ReadingForumPosts.title.contains(word),
                ReadingForumPosts.content.contains(word),
                ReadingForumPosts.book_title.contains(word),
            )
        )
        .order_by(ReadingForumPosts.created_at.desc())
        .all()
    )

    return posts


# ✅ 게시글 작성
@router.post(
    "/posts",
    response_model=ReadingForumPostCreate,
    summary="독서토론 게시글 작성",
    description="""
새로운 독서토론 게시글을 생성합니다.

### 주요 기능
- 로그인한 사용자만 생성 가능
- 책 제목(book_title), 토론 태그(discussion_tags) 포함 가능
- `parent_id` 존재 시 댓글/답글로 처리
"""
)
def create_post(
    request: ReadingForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(
            status_code=401, detail={"message": "사용 권한이 없습니다."}
        )
    if not request.title or request.title == " ":
        raise HTTPException(status_code=400,detail={"message":"제목을 입력해주세요."})
    new_post = ReadingForumPosts(
        user_id=user.id,
        title=request.title,
        content=request.content,
        book_title=request.book_title,
        discussion_tags=request.discussion_tags,
        parent_id=request.parent_id,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


# ✅ 게시글 수정
@router.patch(
    "/posts/{list_id}",
    response_model=ReadingForumPostUpdate,
    summary="독서토론 게시글 수정",
    description="""
특정 독서토론 게시글을 수정합니다.

### 주요 기능
- 작성자 본인만 수정 가능
- 제목, 내용, 책 제목, 토론 태그 수정 가능
- 수정 시 `updated_at` 자동 갱신
"""
)
def update_post(
    request: ReadingForumPostUpdate,
    list_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == list_id).first()
    if not post:
        raise HTTPException(
            status_code=404,
            detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."},
        )

    if post.user_id != user.id:
        raise HTTPException(
            status_code=401, detail={"message": "다른 유저의 게시글 편집 금지"}
        )

    updated = False
    if request.title is not None:
        post.title = request.title
        updated = True
    if request.content is not None:
        post.content = request.content
        updated = True
    if request.book_title is not None:
        post.book_title = request.book_title
        updated = True
    if request.discussion_tags is not None:
        post.discussion_tags = request.discussion_tags
        updated = True

    if updated:
        post.updated_at = datetime.now()
        db.commit()
        db.refresh(post)
        return post

    return {"로그": "수정될 것이 없거나 실패했습니다."}


# ✅ 게시글 삭제
@router.delete(
    "/posts/{list_id}",
    summary="독서토론 게시글 삭제",
    description="""
특정 독서토론 게시글을 삭제합니다.

### 주요 기능
- 작성자 본인만 삭제 가능
- 삭제 성공 시 `{ "성공여부": true }` 반환
"""
)
def delete_post(
    list_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == list_id).first()
    if not post:
        raise HTTPException(
            status_code=404,
            detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."},
        )
    if post.user_id != user.id:
        raise HTTPException(status_code=401, detail={"message": "삭제 권한이 없습니다."})

    db.delete(post)
    db.commit()
    return {"성공여부": True}


# ✅ 댓글 / 대댓글 생성 (2 depth까지만)
@router.post(
    "/comments",
    response_model=ReadingForumPostRead,
    summary="독서토론 댓글 / 대댓글 작성",
    description="""
지정된 부모글 또는 댓글에 대해 댓글을 작성합니다.

### 주요 기능
- **게시글 ID(parent_id)가 부모이면 → 댓글(1 depth) 작성**
- **댓글 ID(parent_id)가 부모이면 → 대댓글(2 depth) 작성**
- **대대댓글(3 depth 이상)은 작성 불가 (서버에서 차단)**
- 로그인한 사용자 본인만 작성 가능
"""
)
def create_comment(
    parent_id: int,
    request: ReadingForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parent_post = (
        db.query(ReadingForumPosts)
        .options(joinedload(ReadingForumPosts.user))
        .filter(ReadingForumPosts.id == parent_id)
        .first()
    )
    if not parent_post:
        raise HTTPException(status_code=404, detail="부모글이 존재하지 않습니다.")

    if user.id != request.user_id:
        raise HTTPException(status_code=401, detail="유저 확인 바랍니다.")

    # 🔒 대대댓글 방지 (2 depth까지만 허용)
    if parent_post.parent_id is not None:
        parent_of_parent_id = parent_post.parent_id
        grand_parent = (
            db.query(ReadingForumPosts)
            .filter(ReadingForumPosts.id == parent_of_parent_id)
            .first()
        )
        if grand_parent and grand_parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="대댓글까지만 작성 가능합니다.")

    new_comment = ReadingForumPosts(
        user_id=user.id,
        content=request.content,
        parent_id=parent_id,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


# ✅ 특정 부모글의 댓글 리스트 조회 (1 depth)
@router.get(
    "/comments/{parent_id}",
    response_model=List[ReadingForumPostRead],
    summary="독서토론 댓글 목록 조회",
    description="""
특정 부모 게시글(parent_id)의 **직접 자식 댓글(1 depth)** 목록을 조회합니다.

### 주요 기능
- 댓글은 최신 순서로 정렬되어 반환됩니다.
- 대댓글은 포함되지 않습니다. (대댓글까지 보고 싶다면 `/posts/{id}` 상세 조회 사용)
"""
)
def get_comments(
    parent_id: int,
    db: Session = Depends(get_db),
):
    comments = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.parent_id == parent_id)
        .options(joinedload(ReadingForumPosts.user))
        .order_by(ReadingForumPosts.created_at.desc())
        .all()
    )
    return comments


# ✅ 댓글 수정
@router.patch(
    "/comments/{comment_id}",
    response_model=ReadingForumPostUpdate,
    summary="독서토론 댓글 수정",
    description="""
특정 댓글을 수정합니다.

### 주요 기능
- 댓글 작성자 본인만 수정 가능
- 내용(content) 및 제목(title) 수정 가능
- 수정 시 updated_at 갱신
"""
)
def update_comment(
    comment_id: int,
    request: ReadingForumPostUpdate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.id == comment_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if user.id != comment.user_id:
        raise HTTPException(status_code=401, detail="다른 유저의 댓글은 수정할 수 없습니다.")

    updated = False
    if request.content is not None:
        comment.content = request.content
        updated = True

    if updated:
        comment.updated_at = datetime.now()
        db.commit()
        db.refresh(comment)
        return comment

    return {"로그": "수정될 것이 없거나 실패했습니다."}


# ✅ 댓글 삭제
@router.delete(
    "/comments/{comment_id}",
    summary="독서토론 댓글 삭제",
    description="""
특정 댓글을 삭제합니다.

### 주요 기능
- 댓글 작성자 본인만 삭제 가능
- 삭제 성공 시 `{ "성공여부": true }` 반환
"""
)
def delete_comment(
    comment_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.id == comment_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if user.id != comment.user_id:
        raise HTTPException(status_code=401, detail="다른 유저의 댓글은 삭제할 수 없습니다.")

    db.delete(comment)
    db.commit()
    return {"성공여부": True}
