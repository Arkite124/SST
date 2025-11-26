from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from data.postgresDB import SessionLocal
from models import (
    ParentForumPosts,
    ParentForumComments,
    Users
)
from app.routes.login.login import get_current_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/communities/parent", tags=["parent-forum"])


# ===============================================================
# DB 연결
# ===============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================================================
# SCHEMAS
# ===============================================================

# ▶ 유저 정보 스키마
class UserNickname(BaseModel):
    id: int
    nickname: str

    class Config:
        from_attributes = True


# ▶ 게시글 생성 요청
class PostCreate(BaseModel):
    title: str
    content: str
    category: str  # parenting, counseling, concern, education, health, etc.
    is_important: Optional[bool] = False


# ▶ 게시글 수정 요청
class PostUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    category: Optional[str]
    is_important: Optional[bool]


# ▶ 댓글 생성 요청
class CommentCreate(BaseModel):
    post_id: int
    reply_id: Optional[int] = None  # 댓글이면 None, 대댓글이면 댓글ID
    content: str

# ▶ 댓글 수정 요청
class CommentUpdate(BaseModel):
    content: str

# ▶ 조회 응답 구조
class CommentRead(BaseModel):
    id: int
    post_id: int
    reply_id: Optional[int]
    content: str
    created_at: datetime
    updated_at: datetime
    user: UserNickname
    has_replies: bool = False   # ← 대댓글 확인여부(없으면 false, 있으면 true)

    class Config:
        from_attributes = True

class ParentForumPostRead(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_important: bool
    created_at: datetime
    updated_at: datetime
    comment_count: int
    user: UserNickname

    class Config:
        from_attributes = True

CommentRead.model_rebuild()

# ▶ 부모 게시글 리스트 응답
class ParentForumPostListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ParentForumPostRead]

class CommentListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[CommentRead]

# ===============================================================
# 📌 1. 게시글 리스트 조회
# ===============================================================
@router.get(
    "/posts",
    response_model=ParentForumPostListResponse,
    summary="학부모 게시판 게시글(최상위 부모글) 목록 조회",
    description="""
학부모 게시판의 **부모 게시글 목록을 페이지네이션 형태로 조회**합니다.

---

## 🔍 조회 기능 설명

- `parent_forum_posts` 테이블의 **부모글(=게시글)** 만 조회합니다.
- `category` 값으로 필터링할 수 있습니다.
- 각 게시글에는 **댓글 개수(comment_count)** 를 함께 반환합니다.
- 최신순(created_at DESC)으로 정렬됩니다.

---

## 📌 Query Parameters

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `page` | int | 조회할 페이지 번호 (기본값 1) |
| `size` | int | 한 페이지당 게시글 수 (기본값 10) |
| `category` | str | 영문 카테고리: parenting(육아), counseling(상담), concern(고민), education(교육), health(건강), etc(기타) |

---

## 📌 Response Example (옵션 1: 매우 상세)

```json
{
  "total": 52,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 1,
      "title": "육아 스트레스 공유합니다",
      "content": "요즘 너무 힘들어요...",
      "category": "parenting",
      "is_important": false,
      "created_at": "2025-01-01T12:00:00",
      "updated_at": "2025-01-01T12:00:00",
      "comment_count": 3,
      "user": {
        "id": 3,
        "nickname": "행복맘"
      }
    }
  ]
}
"""
)
def get_posts(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size

    query = db.query(ParentForumPosts)
    if category:
        query = query.filter(ParentForumPosts.category == category)

    total = query.count()

    posts = (
        query.order_by(ParentForumPosts.created_at.desc())
        .offset(offset)
        .limit(size)
        .options(joinedload(ParentForumPosts.user))
        .all()
    )

    items = []
    for post in posts:
        comment_count = (
            db.query(func.count(ParentForumComments.id))
            .filter(ParentForumComments.post_id == post.id)
            .scalar()
        )

        items.append(
            ParentForumPostRead(
                id=post.id,
                title=post.title,
                content=post.content,
                category=post.category,
                is_important=post.is_important,
                created_at=post.created_at,
                updated_at=post.updated_at,
                user=UserNickname.model_config(post.user),
                comment_count=comment_count,
            )
        )

    return {"total": total, "page": page, "size": size, "items": items}

# ===============================================================
# 📌 2. 게시글 상세 조회
# ===============================================================

@router.get(
"/posts/{post_id}",
response_model=ParentForumPostRead,
summary="게시글 상세 조회 + 댓글 트리(depth 2)",
description="""
특정 게시글의 전체 내용을 조회합니다.
또한 댓글 + 대댓글(depth = 2) 트리 구조로 함께 반환합니다.

Response 포함 데이터

게시글 본문(title, content, category 등)

작성자 정보(user)

댓글 목록(depth 2까지)

총 댓글 수(comment_count)

Response Example
{
  "id": 1,
  "title": "육아 스트레스 공유합니다",
  "content": "요즘 너무 힘드네요...",
  "category": "parenting",
  "is_important": false,
  "comment_count": 2,
  "user": {
    "id": 3,
    "nickname": "행복맘"
  }
}
"""
)
def get_post_detail(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(ParentForumPosts)
        .filter(ParentForumPosts.id == post_id)
        .options(joinedload(ParentForumPosts.user))
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시글입니다.")

    comment_count = (
        db.query(func.count(ParentForumComments.id))
        .filter(ParentForumComments.post_id == post_id)
        .scalar()
    )

    return ParentForumPostRead(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        is_important=post.is_important,
        created_at=post.created_at,
        updated_at=post.updated_at,
        user=post.user,
        comment_count=comment_count
    )

# ===============================================================
# 📌 3. 게시글 작성
# ===============================================================

@router.post(
"/posts",
summary="게시글 작성",
description="""
새로운 게시글을 작성합니다.

권한

로그인한 사용자만 작성 가능

카테고리 목록
category	설명
parenting	육아
counseling	상담
concern	    고민
education	교육
health	    건강
etc      	기타
Request Example
{
  "title": "아이 수면 패턴이 고민이에요",
  "content": "밤에 자주 깨서 너무 힘들어요.",
  "category": "parenting",
  "is_important": false
}
"""
)
def create_post(
request: PostCreate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401, detail="로그인 해주세요. 작성할 권한이 없습니다.")
    new_post = ParentForumPosts(
    user_id=user.id,
    title=request.title,
    content=request.content,
    category=request.category,
    is_important=request.is_important,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

# ===============================================================
# 📌 4. 게시글 수정
# ===============================================================

@router.patch(
"/posts/{post_id}",
summary="게시글 수정",
description="""
게시글을 수정합니다.

✔ 작성자 본인만 수정 가능
✔ 제목·내용·카테고리 개별 수정 가능

"""
)
def update_post(
post_id: int,
request: PostUpdate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    post = db.query(ParentForumPosts).filter(ParentForumPosts.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    updated = False

    if request.title is not None:
        post.title = request.title
        updated = True
    if request.content is not None:
        post.content = request.content
        updated = True
    if request.category is not None:
        post.category = request.category
        updated = True
    if request.is_important is False:
        post.is_important = False

    if updated:
        post.updated_at = datetime.now()
        db.commit()
        db.refresh(post)

    return post

# ===============================================================
# 📌 5. 게시글 삭제
# ===============================================================
@router.delete(
"/posts/{post_id}",
summary="게시글 삭제",
description="""
게시글을 삭제합니다.

✔ 작성자 본인만 삭제 가능
✔ 댓글도 함께 삭제 (DB cascade 적용)

"""
)
def delete_post(
post_id: int,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    post = db.query(ParentForumPosts).filter(ParentForumPosts.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    db.delete(post)
    db.commit()
    return {"success": True}
# ===============================================================
# 6. 댓글 목록 출력
# ===============================================================
@router.get(
    "/posts/{post_id}/comments",
    response_model=CommentListResponse,
    summary="게시글의 1단계 댓글 목록 조회 (reply_id = NULL + 페이지네이션)",
    description="""
    게시글의 **1단계 댓글(reply_id = null)** 만 조회합니다.  
    대댓글은 포함되지 않으며, 각 댓글은 **대댓글 존재 여부(has_replies)** 를 함께 반환합니다.

    ---

    ## 기능 설명
    - reply_id = NULL 인 댓글만 조회 (즉, 상위 댓글)
    - 페이지네이션 지원
    - 각 댓글은 `has_replies` 필드 포함 → 대댓글 유무를 프론트에서 판단 가능
    - 정렬: 최신순(created_at DESC)

    ---

    ## Query Parameters
    |  파라미터  |  타입  |  설명  |
    |---------|------|------|
    |  `page`  |  int  | 페이지 번호 (기본: 1) |
    |  `size`  |  int  | 페이지당 개수 (기본: 10) |

    ---

    ## 응답 예시
    ```json
    {
      "total": 5,
      "page": 1,
      "size": 10,
      "items": [
        {
          "id": 10,
          "post_id": 1,
          "reply_id": null,
          "content": "저도 공감합니다!",
          "created_at": "2025-01-01T12:00:00",
          "updated_at": "2025-01-01T12:00:00",
          "user": { "id": 4, "nickname": "행복맘" },
          "has_replies": true
        },
        {
          "id": 14,
          "post_id": 1,
          "reply_id": null,
          "content": "힘내세요!",
          "created_at": "2025-01-02T10:10:00",
          "updated_at": "2025-01-02T10:10:00",
          "user": { "id": 5, "nickname": "희망아빠" },
          "has_replies": false
        }
      ]
    }
    """
)
def get_parent_comments(
    post_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    post = db.query(ParentForumPosts).filter(ParentForumPosts.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 존재하지 않습니다.")

    offset = (page - 1) * size

    base_query = db.query(ParentForumComments).filter(
        ParentForumComments.post_id == post_id,
        ParentForumComments.reply_id.is_(None)
    )

    total = base_query.count()

    comments = (
        base_query
        .order_by(ParentForumComments.created_at.desc())
        .offset(offset)
        .limit(size)
        .options(joinedload(ParentForumComments.user))
        .all()
    )

    # ✔ 상위 댓글마다 대댓글이 존재하는지 체크
    comment_responses = []
    for c in comments:
        has_replies = db.query(ParentForumComments).filter(
            ParentForumComments.reply_id == c.id
        ).count() > 0

        comment_responses.append(
            CommentRead(
                id=c.id,
                post_id=c.post_id,
                reply_id=c.reply_id,
                content=c.content,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=c.user,
                has_replies=has_replies
            )
        )
    return CommentListResponse(
        total=total,
        page=page,
        size=size,
        items=comment_responses
    )
# ===============================================================
# 7. 대댓글 목록 출력
# ===============================================================
@router.get(
    "/posts/{post_id}/comments/{comment_id}/replies",
    response_model=CommentListResponse,
    summary="특정 댓글의 대댓글 목록 조회 (reply_id = comment_id + 페이지네이션)",
    description="""
    특정 댓글에 달린 **대댓글(reply_id = 해당 comment_id)** 목록을 페이지네이션 형태로 조회합니다.  
    대댓글은 2단계까지만 존재하며, 대대댓글은 허용되지 않습니다.

    ---

    ##  기능 설명
    - reply_id = comment_id 인 대댓글만 조회
    - 페이지네이션 지원
    - 정렬: 오래된 순(created_at ASC)
    - 대댓글은 더 이상 하위 댓글이 없으므로 has_replies = false

    ---

    ## Query Parameters
    | 파라미터 | 타입 | 설명 |
    |---------|------|------|
    | `page` | int | 페이지 번호 (기본: 1) |
    | `size` | int | 페이지당 개수 (기본: 10) |

    ---

    ## 응답 예시
    ```json
    {
      "total": 2,
      "page": 1,
      "size": 10,
      "items": [
        {
          "id": 21,
          "post_id": 1,
          "reply_id": 10,
          "content": "힘내세요! 공감해요.",
          "created_at": "2025-01-02T12:00:00",
          "updated_at": "2025-01-02T12:00:00",
          "user": { "id": 6, "nickname": "행복아빠" },
          "has_replies": false
        },
        {
          "id": 25,
          "post_id": 1,
          "reply_id": 10,
          "content": "저도 같은 고민이에요.",
          "created_at": "2025-01-02T13:00:00",
          "updated_at": "2025-01-02T13:00:00",
          "user": { "id": 7, "nickname": "사랑맘" },
          "has_replies": false
        }
      ]
    }
    """
)
def get_replies(
    post_id: int,
    comment_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    # 게시글 존재 여부 체크
    post = db.query(ParentForumPosts).filter(ParentForumPosts.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 존재하지 않습니다.")

    # parent comment 체크
    parent_comment = db.query(ParentForumComments).filter(
        ParentForumComments.id == comment_id
    ).first()

    if not parent_comment:
        raise HTTPException(status_code=404, detail="댓글이 존재하지 않습니다.")

    offset = (page - 1) * size

    base_query = db.query(ParentForumComments).filter(
        ParentForumComments.post_id == post_id,
        ParentForumComments.reply_id == comment_id
    )

    total = base_query.count()

    replies = (
        base_query
        .order_by(ParentForumComments.created_at.asc())
        .offset(offset)
        .limit(size)
        .options(joinedload(ParentForumComments.user))
        .all()
    )
    # 대댓글은 has_replies = False (3단계 금지)
    reply_responses = [
        CommentRead(
            id=c.id,
            post_id=c.post_id,
            reply_id=c.reply_id,
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at,
            user=c.user,
            has_replies=False
        )
        for c in replies
    ]

    return CommentListResponse(
        total=total,
        page=page,
        size=size,
        items=reply_responses
    )

# ===============================================================
# 8. 댓글 작성 (댓글 + 대댓글)
# ===============================================================

@router.post(
"/comments",
summary="댓글 / 대댓글 작성",
description="""
댓글 또는 대댓글을 작성합니다.
Depth 규칙
유형	설명	reply_id로 구분
댓글(1단계)	게시글에 작성	null
대댓글(2단계)	댓글에 작성	댓글 ID
3단계 금지	대댓글에 또 달기	차단
3 depth 차단 예시

댓글(ID=10)에 대댓글(ID=20) 작성 → 허용

대댓글(ID=20)에 또 댓글 달기 → ❌ 오류
Request Example
{
  "post_id": 1,
  "reply_id": 10,
  "content": "저도 공감합니다!"
}

"""
)
def create_comment(
request: CommentCreate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    # 1) 게시글 존재 여부 체크
    post = db.query(ParentForumPosts).filter(ParentForumPosts.id == request.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 존재하지 않습니다.")

    # 2) reply_id가 있으면 대댓글
    if request.reply_id:
        parent_comment = db.query(ParentForumComments).filter(
            ParentForumComments.id == request.reply_id
        ).first()

        if not parent_comment:
            raise HTTPException(status_code=404, detail="부모 댓글이 존재하지 않습니다.")

        # 대대댓글 백엔드에서 사전 차단
        if parent_comment.reply_id is not None:
            raise HTTPException(status_code=400, detail="대댓글에는 대댓글을 작성할 수 없습니다. (2 depth 제한)")

    new_comment = ParentForumComments(
        post_id=request.post_id,
        reply_id=request.reply_id,
        user_id=user.id,
        content=request.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

# ===============================================================
# 9. 댓글 수정
# ===============================================================

@router.patch(
"/comments/{comment_id}",
summary="댓글 수정",
description="""
댓글 내용을 수정합니다.

✔ 작성자 본인만 수정 가능
✔ content만 수정 가능

"""
)
def update_comment(
comment_id: int,
request: CommentUpdate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    comment = db.query(ParentForumComments).filter(ParentForumComments.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 존재하지 않습니다.")

    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    comment.content = request.content
    comment.updated_at = datetime.now()

    db.commit()
    db.refresh(comment)
    return comment

# ===============================================================
# 10. 댓글 삭제
# ===============================================================
@router.delete(
"/comments/{comment_id}",
summary="댓글 삭제",
description="""
댓글을 삭제합니다.

✔ 작성자 본인만 삭제 가능
✔ 대댓글도 함께 삭제됨 (cascade)

"""
)
def delete_comment(
comment_id: int,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db)
):
    comment = db.query(ParentForumComments).filter(ParentForumComments.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 존재하지 않습니다.")

    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    db.delete(comment)
    db.commit()
    return {"success": True}