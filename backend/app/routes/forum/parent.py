from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import aliased,joinedload
from sqlalchemy import func,or_
from sqlalchemy.orm import Session

from app.routes.forum.student import ReadingForumPostRead
from app.routes.login.login import profile_data, get_current_user
from data.postgresDB import SessionLocal
from models import ParentForumPosts as ParentForumPost, Users, ParentForumPosts
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

# 대댓글 트리구조
def get_children_level2(db, parent_id: int):
    """대댓글(2 depth)까지 조회 — 최신순 DESC"""
    level1 = (
        db.query(ParentForumPost)
        .filter(ParentForumPost.parent_id == parent_id)
        .order_by(ParentForumPost.created_at.desc())   # ← 변경됨!
        .all()
    )

    result = []
    for comment in level1:
        # 🔥 대댓글(2 depth)
        level2 = (
            db.query(ParentForumPost)
            .filter(ParentForumPost.parent_id == comment.id)
            .order_by(ParentForumPost.created_at.desc())  # ← 변경됨!
            .all()
        )

        result.append(
            ParentForumPostRead(
                id=comment.id,
                parent_id=comment.parent_id,
                title=comment.title,
                content=comment.content,
                category=comment.category,
                is_important=comment.is_important,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                user=comment.user,
                comment_count=len(level2),
                children=[
                    ParentForumPostRead(
                        id=reply.id,
                        parent_id=reply.parent_id,
                        title=reply.title,
                        content=reply.content,
                        category=reply.category,
                        is_important=reply.is_important,
                        created_at=reply.created_at,
                        updated_at=reply.updated_at,
                        user=reply.user,
                        comment_count=0,
                        children=[]
                    )
                    for reply in level2
                ]
            )
        )
    return result
class UserNickname(BaseModel):
    id:int
    nickname: str

    class Config:
        from_attributes = True

# ✅ 글 생성 요청용
class ParentForumPostCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None
    title: Optional[str] = None
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
    title: Optional[str] = None
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
        raise HTTPException(status_code=404, detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."})
    # 댓글(1 depth) + 대댓글(2 depth)
    children = get_children_level2(db, post.id)
    return ParentForumPostRead(
        id=post.id,
        parent_id=post.parent_id,
        title=post.title,
        content=post.content,
        category=post.category,
        is_important=post.is_important,
        created_at=post.created_at,
        updated_at=post.updated_at,
        user=post.user,
        comment_count=len(children),
        children=children
    )
@router.get(
    "/posts/search",
    response_model=list[ParentForumPostRead],
    summary="학부모 게시판 게시글 검색",
    description="""
제목 또는 내용에 특정 단어가 포함된 학부모 게시판의 부모 게시글을 검색합니다.

### 주요 기능
- **부모 게시글(parent_id IS NULL)** 만 검색 대상
- 제목(`title`) + 내용(`content`) 모두 검색
- 중복 제거 후 `created_at` 기준 최신순 정렬
- 댓글/대댓글은 포함되지 않고, 게시글 목록만 반환

### Query Parameters
- **word (str)** — 검색어 (제목/내용에 포함되는 문자열)

### Response Example
```json
[
  {
    "id": 10,
    "parent_id": null,
    "title": "결제 관련 문의",
    "content": "정기결제 변경이 가능한가요?",
    "category": "payment",
    "is_important": false,
    "created_at": "2025-01-10T12:00:00",
    "updated_at": "2025-01-10T12:00:00",
    "comment_count": 3,
    "user": {
      "id": 3,
      "nickname": "김학부모"
    },
    "children": []
  }
]
"""
)
def search_parents_posts(
word: str = Query(..., description="제목/내용에 포함될 검색어"),
db: Session = Depends(get_db),
):
 # 부모글만 대상
    base_query = db.query(ParentForumPost).filter(ParentForumPost.parent_id == None)
    # 제목/내용 둘 다 검색 (OR 조건)
    posts = (
        base_query
        .filter(
            or_(
                ParentForumPost.title.contains(word),
                ParentForumPost.content.contains(word),
            )
        )
        .order_by(ParentForumPost.created_at.desc())
        .options(joinedload(ParentForumPost.user))
        .all()
    )
    # ParentForumPostRead(from_attributes=True) 덕분에 ORM 리스트 그대로 반환 가능
    return posts

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
    if not request.title or request.title == " ":
        raise HTTPException(status_code=400,detail={"message":"제목을 입력해주세요."})
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
    summary="학부모 게시판 댓글 / 대댓글 작성",
    description="""
특정 게시글 또는 댓글에 댓글을 작성합니다.

### 주요 기능
- **게시글 ID(parent_id)가 부모이면 → 댓글(1 depth) 작성**
- **댓글 ID(parent_id)가 부모이면 → 대댓글(2 depth) 작성**
- **대대댓글(3 depth 이상)은 작성 불가 (서버에서 차단)**  
- 로그인한 사용자만 작성 가능
- 댓글과 대댓글 모두 제목 입력 가능
- 부모 게시글 또는 댓글이 존재하는지 확인 후 작성

### 요청 파라미터
- **parent_id (int)** : 댓글을 달 부모의 ID  
    - 게시글 ID → 댓글  
    - 댓글 ID → 대댓글  

### Request Body 예시
```json
{
  "user_id": 1,
  "title": "문의드립니다",
  "content": "답변 부탁드립니다.",
  "category": "system"
}
응답 구조
작성된 댓글 또는 대댓글의 정보 반환
"""
)
def create_comment(
    parent_id: int,
    request: ParentForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1) 부모 확인
    parent_post = db.query(ParentForumPost).filter(ParentForumPost.id == parent_id).first()
    if not parent_post:
        raise HTTPException(status_code=404, detail="부모글이 존재하지 않습니다.")

    # 2) 로그인 검증
    if not request.user_id == user.id:
        raise HTTPException(status_code=401, detail="유저 확인 바랍니다.")

    # 3) 대대댓글 방지
    if parent_post.parent_id is not None:
        # 부모글의 parent_id != None → 부모가 댓글 → request는 대댓글
        # 근데 부모가 댓글의 부모(=대댓글)라면? → 금지
        parent_of_parent = parent_post.parent_id

        grand_parent = db.query(ParentForumPost).filter(ParentForumPost.id == parent_of_parent).first()
        if grand_parent and grand_parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="대댓글까지만 작성 가능합니다.")

    # 4) 댓글 / 대댓글 생성
    new_comment = ParentForumPost(
        user_id=user.id,
        content=request.content,
        parent_id=parent_id,
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
- 최신순 대로 정렬
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
        .order_by(ParentForumPost.created_at.desc())
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