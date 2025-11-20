from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import aliased,joinedload
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.routes.forum.student import ReadingForumPostRead
from app.routes.login.login import profile_data, get_current_user
from data.postgresDB import SessionLocal
from models import ParentForumPosts as ParentForumPost, Users
from pydantic import BaseModel, Field
from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserNickname(BaseModel):
    id:int
    nickname: str

    class Config:
        from_attributes = True

# ✅ 글 생성 요청용
class ParentForumPostCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None
    title: str
    content: str
    category: Optional[str] = None
    is_important: Optional[bool] = False

# ✅ 글 수정 요청용
class ParentForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_important: Optional[bool] = None

# ✅ 글 조회 응답용 (User 정보까지 포함)
class ParentForumPostRead(BaseModel):
    id: int
    parent_id: Optional[int] = None
    title: str
    content: str
    category: Optional[str]
    is_important: bool
    created_at: datetime
    updated_at: datetime
    children: List["ParentForumPostRead"] = Field(default_factory=list)  # ✅ 안전한 기본값
    user: UserNickname
    comment_count: int = 0

    class Config:
        from_attributes = True

# ForwardRef 갱신
ParentForumPostRead.model_rebuild()

class ParentForumPostListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ParentForumPostRead]


@router.get("/posts", response_model=ParentForumPostListResponse)
def get_posts(
    category: Optional[str] = None,
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=20, description="한 페이지당 게시글 수"),
    db: Session = Depends(get_db),
    summary="학부모 게시판 게시글 조회",
    description="""
학부모 게시판의 **부모 글(최상위 게시글)** 목록을 페이지네이션 형태로 조회합니다.

### 주요 기능
- 페이지 번호(page)와 페이지 크기(size)를 기준으로 게시글을 조회합니다.
- `parent_id`가 NULL인 **부모 글만 조회**합니다.
- 각 게시글에 포함된 **댓글 수(comment_count)** 를 함께 계산합니다.
- 옵션으로 `category` 필터를 사용할 수 있습니다.
- 결과는 `total`, `page`, `size`, `items` 구조로 반환됩니다.

###  Query Parameters
- **page (int)** — 페이지 번호 (기본값: 1)
- **size (int)** — 한 페이지당 가져올 게시글 수 (기본값: 10)
- **category (str | Optional)** — 특정 카테고리로 필터링 (예: "system", "payment", "etc")

###  Response Example
```json
{
  "total": 52,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 1,
      "title": "공지사항",
      "content": "중요 공지입니다.",
      "category": "system",
      "is_important": true,
      "comment_count": 3,
      "user": { "nickname": "관리자" },
      "created_at": "2025-01-01T12:00:00",
      "updated_at": "2025-01-01T12:00:00"
    }
  ]
}"""
):
    """
    학부모 게시판 게시글 목록 조회 엔드포인트
    """
    offset = (page - 1) * size
    comment = aliased(ParentForumPost)

    # ✅ 총 게시글 수 (부모글만 + 카테고리 조건 적용)
    total_query = db.query(func.count(ParentForumPost.id)).filter(
        ParentForumPost.parent_id == None
    )
    if category:
        total_query = total_query.filter(ParentForumPost.category == category)
    total = total_query.scalar()

    # ✅ 댓글 수 포함된 subquery
    subq = (
        db.query(
            ParentForumPost.id.label("post_id"),
            func.count(comment.id).label("comment_count")
        )
        .outerjoin(comment, comment.parent_id == ParentForumPost.id)
        .filter(ParentForumPost.parent_id == None)
        .group_by(ParentForumPost.id)
        .subquery()
    )

    # ✅ 본문 조회
    query = (
        db.query(ParentForumPost, subq.c.comment_count)
        .join(subq, subq.c.post_id == ParentForumPost.id)
        .filter(ParentForumPost.parent_id == None)
        .options(joinedload(ParentForumPost.user))
        .order_by(ParentForumPost.created_at.desc())
        .offset(offset)
        .limit(size)
    )

    if category:
        query = query.filter(ParentForumPost.category == category)

    results = query.all()

    # 🔥 변환
    items = [
        ParentForumPostRead(
            id=post.id,
            title=post.title,
            parent_id=post.parent_id,
            content=post.content,
            category=post.category,
            is_important=post.is_important,
            created_at=post.created_at,
            updated_at=post.updated_at,
            comment_count=comment_count,
            user=post.user
        )
        for post, comment_count in results
    ]

    # 🔥 최종 응답
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": items
    }

@router.get(
    "/posts/{post_id}",
    response_model=ParentForumPostRead,
    summary="학부모 게시판 게시글 상세 조회",
    description="""
특정 게시글을 ID로 조회합니다.

### 주요 기능
- 게시글 데이터 + 작성자 정보 포함
- 존재하지 않을 경우 404 반환
"""
)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ParentForumPost).filter(ParentForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    return post
@router.get(
    "/posts/search",
    response_model=list[ReadingForumPostRead],
    summary="학부모 게시판 게시글 검색",
    description="""
제목 또는 내용에 특정 단어가 포함된 게시글을 검색합니다.

### 주요 기능
- 부모 게시글만 검색
- 제목 + 내용 모두 검색 후 합침
- 중복 제거
- 최신순 정렬
"""
)
def search_parents_posts(word: str, db: Session = Depends(get_db)):
    posts_title = db.query(ParentForumPost).filter(ParentForumPost.title.contains(word)).filter(ParentForumPost.parent_id is None).all()
    posts_contents=db.query(ParentForumPost).filter(ParentForumPost.content.contains(word)).filter(ParentForumPost.parent_id is None).all()
    results=posts_title + posts_contents
    results.sort(key=lambda r: r.created_at, reverse=True)
    # 결과 합치기 (중복 제거 필요하면 set 사용)
    result = posts_title + posts_contents
    # created_at 기준 최신순 정렬
    result.sort(key=lambda x: x.created_at, reverse=True)
    # id기준 중복 제거
    unique_result = {item.id: item for item in result}.values()
    return sorted(unique_result, key=lambda x: x.created_at, reverse=True)

@router.post(
    "/posts",
    response_model=ParentForumPostCreate,
    summary="학부모 게시판 게시글 작성",
    description="""
새로운 부모 게시글 또는 답글(부모 ID 존재 시)을 생성합니다.

### 주요 기능
- 로그인한 사용자만 생성 가능
- 카테고리, 중요글 여부 설정 가능
"""
)
def create_post(
    request: ParentForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401,detail={"message":"사용 권한이 없습니다."})
    new_post = ParentForumPost(
        user_id=user.id,
        title=request.title,
        content=request.content,
        category=request.category,
        is_important=request.is_important,
        parent_id=request.parent_id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.patch(
    "/posts/{post_id}",
    response_model=ParentForumPostUpdate,
    summary="학부모 게시판 게시글 수정",
    description="""
특정 게시글의 내용을 수정합니다.

### 주요 기능
- 작성자 본인만 수정 가능
- 제목, 내용, 중요 여부, 카테고리 개별 수정 가능
"""
)
def update_post(
    request: ParentForumPostUpdate,
    post_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id=user.id
    post = db.query(ParentForumPost).filter(ParentForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."})
    updated = False
    if not user_id == post.user_id:
        raise HTTPException(status_code=401,detail="다른유저의 게시글 편집 금지")
    if request.title is not None:
        post.title = request.title
        updated = True
    if request.content is not None:
        post.content = request.content
        updated = True
    if request.category is not None:
        post.category = request.category
        updated = True
    if request.is_important is not None:
        post.is_important = request.is_important
        updated = True

    if updated:
        post.updated_at = datetime.now()
        db.commit()
        db.refresh(post)
        return post
    return {"로그": "수정될 것이 없거나 실패했습니다."}

# ✅ 댓글 생성
@router.post(
    "/comments",
    response_model=ParentForumPostRead,
    summary="학부모 게시판 댓글 작성",
    description="""
특정 부모글에 댓글을 작성합니다.

### 주요 기능
- 부모 게시글 존재 여부 확인
- 로그인한 사용자만 댓글 작성 가능
- 댓글도 제목 입력 가능
"""
)
def create_comment(
    parent_id: int,
    request: ParentForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id=user.id
    parent_post = db.query(ParentForumPost).filter(ParentForumPost.id == parent_id).first()
    if not parent_post:
        raise HTTPException(status_code=404, detail="부모글이 존재하지 않습니다.")
    if not request.user_id==user_id:
        raise HTTPException(status_code=401,detail="유저 확인 바랍니다.")
    new_comment = ParentForumPost(
        user_id=request.user_id,
        title=request.title,          # 댓글도 제목 가능하게
        content=request.content,
        parent_id=parent_id,          # ✅ 부모글 ID 연결
        category=parent_post.category # 부모글 카테고리 따라감
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


# ✅ 특정 부모글의 댓글 리스트 조회
@router.get(
    "/comments/{parent_id}",
    response_model=list[ParentForumPostRead],
    summary="학부모 게시판 댓글 목록 조회",
    description="""
특정 부모 게시글에 달린 댓글 목록을 조회합니다.

### 주요 기능
- 오래된 순서대로 정렬
- 부모 ID 기반 댓글 조회
"""
)
def get_comments(
    parent_id: int,
    db: Session = Depends(get_db)
):
    comments = (
        db.query(ParentForumPost)
        .filter(ParentForumPost.parent_id == parent_id)
        .order_by(ParentForumPost.created_at.asc())
        .all()
    )
    return comments

# ✅ 댓글 수정
@router.patch(
    "/comments/{comment_id}",
    response_model=ParentForumPostUpdate,
    summary="학부모 게시판 댓글 수정",
    description="""
특정 댓글을 수정합니다.

### 주요 기능
- 로그인한 사용자 본인만 수정 가능
- 내용만 수정 가능
- 수정 시 updated_at 자동 갱신
"""
)
def update_comment(
    comment_id: int,
    request: ParentForumPostUpdate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ParentForumPost).filter(ParentForumPost.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if not user.id==request.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    if request.content:
        comment.content = request.content
        comment.updated_at = datetime.now()

    db.commit()
    db.refresh(comment)
    return comment

# ✅ 댓글 삭제
@router.delete(
    "/comments/{comment_id}",
    summary="학부모 게시판 댓글 삭제",
    description="""
특정 댓글을 삭제합니다.

### 주요 기능
- 댓글 작성자 본인만 삭제 가능
- 삭제 후 성공 여부 반환
"""
)
def delete_comment(
    comment_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ParentForumPost).filter(ParentForumPost.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if not user.id==comment.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    db.delete(comment)
    db.commit()
    return {"성공여부": True}
@router.delete(
    "/posts/{list_id}",
    summary="학부모 게시판 게시글 삭제",
    description="""
특정 게시글을 삭제합니다.

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
    post = db.query(ParentForumPost).filter(ParentForumPost.id == list_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    if not user.id==post.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    db.delete(post)
    db.commit()
    return {"성공여부": True}