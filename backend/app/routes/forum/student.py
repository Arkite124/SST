from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import aliased,joinedload
from sqlalchemy import func
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

# ✅ 사용자 닉네임용 (기존과 동일)
class UserNickname(BaseModel):
    nickname: str

    class Config:
        from_attributes = True

# ✅ 글 생성 요청용
class ReadingForumPostCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None  # 부모글 ID
    title: Optional[str] = None
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
    parent_id: Optional[int] = None
    title: Optional[str]
    content: str
    book_title: Optional[str]
    discussion_tags: Optional[str]
    created_at: datetime
    updated_at: datetime = Field(default_factory=datetime.now)
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
@router.get(
    "/posts",
    response_model=ReadingForumPostListResponse,
    summary="독서토론 게시글 목록 조회",
    description="""
독서토론 게시판의 **부모 게시글 목록**을 페이지네이션 형태로 조회합니다.

### 주요 기능
- `parent_id`가 NULL인 부모 글만 조회
- 페이지 번호(page), 페이지 크기(size)를 통한 페이지네이션 처리
- 게시글별 **댓글 개수(comment_count)** 포함
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
    db: Session = Depends(get_db)
):
    offset = (page - 1) * size
    comment = aliased(ReadingForumPosts)

    # ✅ 총 게시글 수 계산 (최상위 게시글만)
    total = db.query(func.count(ReadingForumPosts.id)).filter(ReadingForumPosts.parent_id == None).scalar()

    # ✅ 댓글 수 포함된 게시글 목록 쿼리
    subq = (
        db.query(
            ReadingForumPosts.id.label("post_id"),
            func.count(comment.id).label("comment_count")
        )
        .outerjoin(comment, comment.parent_id == ReadingForumPosts.id)
        .filter(ReadingForumPosts.parent_id == None)
        .group_by(ReadingForumPosts.id)
        .subquery()
    )

    query = (
        db.query(ReadingForumPosts, subq.c.comment_count)
        .join(subq, subq.c.post_id == ReadingForumPosts.id)
        .options(joinedload(ReadingForumPosts.user))  # ✅ 유저 닉네임 미리 로딩
        .order_by(ReadingForumPosts.created_at.desc())
        .offset(offset)
        .limit(size)
    )

    results = query.all()

    # ✅ Pydantic 모델 변환
    items = [
        ReadingForumPostRead(
            id=post.id,
            title=post.title,
            parent_id=post.parent_id,
            content=post.content,
            book_title=post.book_title,
            discussion_tags=post.discussion_tags,
            created_at=post.created_at,
            updated_at=post.updated_at,
            comment_count=comment_count,
            user=post.user,
        )
        for post, comment_count in results
    ]

    # ✅ total 포함 응답 반환
    return {"total": total, "page": page, "size": size, "items": items}

@router.get(
    "/posts/{list_id}",
    response_model=ReadingForumPostRead,
    summary="읽기토론 게시글 상세 조회",
    description="""
특정 독서토론 게시글을 ID로 조회합니다.

### 주요 기능
- 존재하지 않는 게시물 ID 요청 시 404 오류 반환
- 작성자 정보 포함
"""
)
def get_post(list_id: int, db: Session = Depends(get_db)):
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == list_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    return post

@router.get(
    "/posts/search",
    response_model=list[ReadingForumPostRead],
    summary="독서토론 게시글 검색",
    description="""
지정한 키워드가 포함된 게시글을 검색합니다.

### 검색 대상
- 제목(title)
- 내용(content)
- 책 제목(book_title)

### 주요 기능
- 부모 게시글만 검색
- 중복 제거
- 최신순 정렬
"""
)
def search_reading_posts(word: str, db: Session = Depends(get_db)):
    posts_contents=(db.query(ReadingForumPosts)
           .filter(ReadingForumPosts.content.contains(word))
           .filter(ReadingForumPosts.parent_id is None).all())
    post_title=(db.query(ReadingForumPosts)
                .filter(ReadingForumPosts.parent_id is None)
                .filter(ReadingForumPosts.title.contains(word)).all())
    post_book_title=(db.query(ReadingForumPosts)
                     .filter(ReadingForumPosts.parent_id is None)
                     .filter(ReadingForumPosts.book_title.contains(word)).all())
    result=posts_contents + post_title + post_book_title
    # created_at 기준 최신순 정렬
    result.sort(key=lambda x: x.created_at, reverse=True)
    # id기준 중복 제거
    unique_result = {item.id: item for item in result}.values()
    return sorted(unique_result, key=lambda x: x.created_at, reverse=True)

@router.post(
    "/posts",
    response_model=ReadingForumPostCreate,
    summary="읽기토론 게시글 작성",
    description="""
새로운 독서토론 게시글을 생성합니다.

### 주요 기능
- 로그인한 사용자만 생성 가능
- 책 제목(book_title), 토론 태그(discussion_tags) 포함 가능
- parent_id 존재 시 댓글/답글로 처리
"""
)
def create_post(
    request: ReadingForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401,detail={"message":"사용 권한이 없습니다."})
    new_post = ReadingForumPosts(
        user_id=user.id,
        title=request.title,
        content=request.content,
        book_title=request.book_title,
        discussion_tags=request.discussion_tags,
        parent_id=request.parent_id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.patch(
    "/posts/{list_id}",
    response_model=ReadingForumPostUpdate,
    summary="독서토론 게시글 수정",
    description="""
특정 독서토론 게시글을 수정합니다.

### 주요 기능
- 작성자 본인만 수정 가능
- 제목, 내용, 책 제목, 토론 태그 수정 가능
- 수정 시 updated_at 자동 갱신
"""
)
def update_post(
    request: ReadingForumPostUpdate,
    list_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id=user.id
    if not request.user_id==user_id:
        raise HTTPException(status_code=401,detail={"message":"사용 권한이 없습니다."})
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == list_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    if request.list_id:
        post.title = request.title
        post.book_title = request.book_title
        post.updated_at = datetime.now()
        post.content = request.content
        db.commit()
        db.refresh(post)
        return post
    return {"message":"수정될 것이 없거나 실패했습니다."}

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
    db: Session = Depends(get_db)
):

    user_id=user.id
    if not user_id:
        raise HTTPException(status_code=401,detail={"message":"사용 권한이 없습니다."})

    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == list_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    db.delete(post)
    db.commit()
    return {"성공여부": True}

# ✅ 댓글 생성
@router.post(
    "/comments",
    response_model=ReadingForumPostRead,
    summary="독서토론 댓글 작성",
    description="""
지정된 부모글에 대해 댓글을 작성합니다.

### 주요 기능
- 부모 게시글이 존재해야 생성 가능
- 로그인한 사용자 본인만 작성 가능
"""
)
def create_comment(
    parent_id: int,
    request: ReadingForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    parent_post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == parent_id).first()
    if not parent_post:
        raise HTTPException(status_code=404, detail="부모글이 존재하지 않습니다.")
    if user.id != request.user_id:
        raise HTTPException(status_code=401,detail="다른 유저의 게시글은 편집금지")
    new_comment = ReadingForumPosts(
        user_id=request.user_id,
        title=request.title,          # 댓글도 제목 가능하게
        content=request.content,
        parent_id=parent_id,          # ✅ 부모글 ID 연결
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


# ✅ 특정 부모글의 댓글 리스트 조회
@router.get(
    "/comments/{parent_id}",
    response_model=list[ReadingForumPostRead],
    summary="독서토론 댓글 목록 조회",
    description="""
특정 부모 게시글(parent_id)의 댓글 목록을 조회합니다.

### 주요 기능
- 댓글은 최신 순서로 정렬되어 반환됩니다.
"""
)
def get_comments(
    parent_id: int,
    db: Session = Depends(get_db)
):

    comments = (
        db.query(ReadingForumPosts)
        .filter(ReadingForumPosts.parent_id == parent_id)
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
- 내용(content) 수정 가능
- 수정 시 updated_at 갱신
"""
)
def update_comment(
    comment_id: int,
    request: ReadingForumPostUpdate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if user.id != request.user_id:
        raise HTTPException(status_code=401,detail="다른 유저의 게시글은 편집금지")
    if request.content:
        comment.content = request.content
        comment.updated_at = datetime.now()

    db.commit()
    db.refresh(comment)
    return comment


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
    db: Session = Depends(get_db)
):

    comment = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if user.id != comment.user_id:
        raise HTTPException(status_code=401,detail="다른 유저의 게시글은 편집금지")
    db.delete(comment)
    db.commit()
    return {"성공여부": True}