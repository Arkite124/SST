from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from data.postgresDB import SessionLocal
from models import ReadingForumPosts, ReadingForumComments, Users
from pydantic import BaseModel, Field
from app.routes.login.login import get_current_user

router = APIRouter(tags=["reading-forum"])


# -------------------------------------------------
# DB 종속성
# -------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------------------------------------
# Schemas
# -------------------------------------------------

# 사용자 정보 축약 (id, nickname만)
class UserNickname(BaseModel):
    id: int
    nickname: str

    class Config:
        from_attributes = True


# 게시글 생성 요청
class ReadingForumPostCreate(BaseModel):
    title: str
    content: str
    book_title: Optional[str] = None
    discussion_tags: Optional[str] = None


# 게시글 수정 요청
class ReadingForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    book_title: Optional[str] = None
    discussion_tags: Optional[str] = None


# 댓글 생성 요청
class ReadingForumCommentCreate(BaseModel):
    post_id: int
    reply_id: Optional[int] = None  # None이면 댓글, ID 있으면 대댓글
    content: str


# 댓글 수정 요청
class ReadingForumCommentUpdate(BaseModel):
    content: Optional[str] = None


# 댓글 조회 DTO
class ReadingForumCommentRead(BaseModel):
    id: int
    post_id: int
    reply_id: Optional[int]
    content: str
    created_at: datetime
    updated_at: datetime
    user: UserNickname
    has_replies: bool = False
    reply_count: int = 0 # 댓글개수 카운트 시 필요

    class Config:
        from_attributes = True

# 게시글 조회 DTO
class ReadingForumPostRead(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    content: str
    book_title: Optional[str]
    discussion_tags: Optional[str]
    created_at: datetime
    updated_at: datetime
    user: UserNickname
    comment_count: int = 0

    class Config:
        from_attributes = True

class CommentListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReadingForumCommentRead]

# 게시글 목록 응답 DTO
class ReadingForumPostListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReadingForumPostRead]

# -------------------------------------------------
# ✅ 부모 게시글 목록 + 댓글 수
# -------------------------------------------------
@router.get(
    "/posts",
    response_model=ReadingForumPostListResponse,
    summary="독서토론 게시글 목록 조회",
    description="""
독서토론 게시글을 페이지네이션 형태로 조회합니다.

---

##  기능 설명
- 독서토론 게시글(ReadingForumPosts) 목록 조회
- 댓글 수(comment_count) 포함
- 작성자(user) 정보 포함
- 최신순(created_at DESC) 정렬

---

## 쿼리 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|-------|
| page | int | 페이지 번호 (기본: 1) |
| size | int | 페이지당 게시글 수 (기본: 10) |

---

## 응답 예시
```json
{
  "total": 52,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 1,
      "user_id": 3,
      "title": "독서토론합시다",
      "content": "아이와 읽은 책을 공유합니다.",
      "book_title": "어린왕자",
      "discussion_tags": "#우정 #성장",
      "comment_count": 3,
      "user": { "id": 3, "nickname": "책읽는엄마" }
    }
  ]
}
"""
)
def get_posts(
page: int = Query(1, ge=1),
size: int = Query(10, ge=1, le=50),
db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    total = db.query(func.count(ReadingForumPosts.id)).scalar()
    posts = (
        db.query(ReadingForumPosts)
        .options(joinedload(ReadingForumPosts.user))
        .order_by(ReadingForumPosts.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    items = []
    for post in posts:
        comment_count = (
            db.query(func.count(ReadingForumComments.id))
            .filter(ReadingForumComments.post_id == post.id)
            .scalar()
        )
        items.append(
            ReadingForumPostRead(
                id=post.id,
                user_id=post.user_id,
                title=post.title,
                content=post.content,
                book_title=post.book_title,
                discussion_tags=post.discussion_tags,
                created_at=post.created_at,
                updated_at=post.updated_at,
                user=UserNickname.from_orm(post.user),
                comment_count=comment_count,
            )
        )

    return ReadingForumPostListResponse(
        total=total, page=page, size=size, items=items
    )
# -------------------------------------------------
# 게시글 상세 + 댓글/대댓글 트리
# -------------------------------------------------
@router.get(
    "/posts/{post_id}",
    response_model=ReadingForumPostRead,
    summary="독서토론 게시글 상세 조회",
    description="""
특정 독서토론 게시글을 상세 조회합니다.

---

##  기능 설명
- 게시글 정보 + 작성자 정보 반환
- 댓글/대댓글은 포함되지 않음
- 댓글 API는 `/posts/{post_id}/comments` 로 분리됨

---

## 응답 예시
```json
{
  "id": 1,
  "title": "독서토론합시다",
  "content": "아이와 읽은 책 얘기 나눠요",
  "book_title": "어린왕자",
  "discussion_tags": "#우정 #성장",
  "comment_count": 5,
  "user": { "id": 3, "nickname": "책읽는엄마" }
}
"""
)
def get_post_detail(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(ReadingForumPosts)
        .options(joinedload(ReadingForumPosts.user))
        .filter(ReadingForumPosts.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(404, "존재하지 않는 게시글입니다.")
    comment_count = (
        db.query(func.count(ReadingForumComments.id))
        .filter(ReadingForumComments.post_id == post_id)
        .scalar()
    )

    return ReadingForumPostRead(
        id=post.id,
        user_id=post.user_id,
        title=post.title,
        content=post.content,
        book_title=post.book_title,
        discussion_tags=post.discussion_tags,
        created_at=post.created_at,
        updated_at=post.updated_at,
        user=UserNickname.from_orm(post.user),
        comment_count=comment_count,
    )
# -------------------------------------------------
# 게시글 검색 (제목/내용/책제목)
# -------------------------------------------------
@router.get(
"/posts/search",
response_model=List[ReadingForumPostRead],
summary="독서토론 게시글 검색",
description="""
지정한 키워드가 포함된 독서토론 게시글을 검색합니다.

검색 대상
제목(title)

내용(content)

책 제목(book_title)

주요 기능
댓글이 아닌 게시글(ReadingForumPosts) 만 검색

작성자 정보 포함

created_at 기준 최신순 정렬
"""
)
def search_reading_posts(
word: str = Query(..., description="제목/내용/책제목에 포함될 검색어"),
db: Session = Depends(get_db),
):
    posts = (
    db.query(ReadingForumPosts)
    .options(joinedload(ReadingForumPosts.user))
    .filter(
    or_(
    ReadingForumPosts.title.contains(word),
    ReadingForumPosts.content.contains(word),
    ReadingForumPosts.book_title.contains(word),
    )
    )
    .order_by(ReadingForumPosts.created_at.desc())
    .all()
    )

    result: List[ReadingForumPostRead] = []
    for post in posts:
        comment_count = (
        db.query(func.count(ReadingForumComments.id))
        .filter(ReadingForumComments.post_id == post.id)
        .scalar()
        )
    result.append(
        ReadingForumPostRead(
            id=post.id,
            user_id=post.user_id,
            title=post.title,
            content=post.content,
            book_title=post.book_title,
            discussion_tags=post.discussion_tags,
            created_at=post.created_at,
            updated_at=post.updated_at,
            user=UserNickname.from_orm(post.user),
            comment_count=comment_count,
        )
    )
    return result

# -------------------------------------------------
# 게시글 작성
# -------------------------------------------------
@router.post(
"/posts",
response_model=ReadingForumPostRead,
summary="독서토론 게시글 작성",
description="""
새로운 독서토론 게시글을 생성합니다.

주요 기능
로그인한 사용자만 생성 가능

책 제목(book_title), 토론 태그(discussion_tags) 포함 가능
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
    if not request.title or request.title.strip() == "":
        raise HTTPException(status_code=400, detail={"message": "제목을 입력해주세요."})

    new_post = ReadingForumPosts(
        user_id=user.id,
        title=request.title,
        content=request.content,
        book_title=request.book_title,
        discussion_tags=request.discussion_tags,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return ReadingForumPostRead(
    id=new_post.id,
    user_id=new_post.user_id,
    title=new_post.title,
    content=new_post.content,
    book_title=new_post.book_title,
    discussion_tags=new_post.discussion_tags,
    created_at=new_post.created_at,
    updated_at=new_post.updated_at,
    user=UserNickname.from_orm(new_post.user),
    comment_count=0,
    )

# -------------------------------------------------
# 게시글 수정
# -------------------------------------------------
@router.patch(
"/posts/{post_id}",
response_model=ReadingForumPostRead,
summary="독서토론 게시글 수정",
description="""
특정 독서토론 게시글을 수정합니다.

주요 기능
작성자 본인만 수정 가능

제목, 내용, 책 제목, 토론 태그 수정 가능

수정 시 updated_at 자동 갱신
"""
)
def update_post(
post_id: int,
request: ReadingForumPostUpdate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db),
):
    post = (
        db.query(ReadingForumPosts)
        .options(joinedload(ReadingForumPosts.user))
        .filter(ReadingForumPosts.id == post_id)
        .first()
    )
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

    comment_count = (
    db.query(func.count(ReadingForumComments.id))
    .filter(ReadingForumComments.post_id == post.id)
    .scalar()
    )

    return ReadingForumPostRead(
    id=post.id,
    user_id=post.user_id,
    title=post.title,
    content=post.content,
    book_title=post.book_title,
    discussion_tags=post.discussion_tags,
    created_at=post.created_at,
    updated_at=post.updated_at,
    user=UserNickname.from_orm(post.user),
    comment_count=comment_count,
    )

# -------------------------------------------------
# 게시글 삭제
# -------------------------------------------------
@router.delete(
"/posts/{post_id}",
summary="독서토론 게시글 삭제",
description="""
특정 독서토론 게시글을 삭제합니다.

주요 기능
작성자 본인만 삭제 가능

삭제 성공 시 { "성공여부": true } 반환
"""
)
def delete_post(
post_id: int,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db),
):
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == post_id).first()
    if not post:
        raise HTTPException(
        status_code=404,
        detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."},
        )
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail={"message": "삭제 권한이 없습니다."})

    db.delete(post)
    db.commit()
    return {"성공여부": True}

# -------------------------------------------------
# 댓글 목록 조회
# -------------------------------------------------
@router.get(
    "/posts/{post_id}/comments",
    response_model=CommentListResponse,
    summary="1단계 댓글 목록 조회 (reply_id = NULL + 페이지네이션)",
    description="""
특정 게시글의 **상위 댓글(1단계)** 만 조회합니다.

---

## 🔍 기능 설명
- reply_id = NULL 인 댓글만 반환
- has_replies 필드 포함 (대댓글 존재 여부)
- 최신순 정렬
- 대댓글은 포함되지 않음

---

## 쿼리 파라미터
- page (기본값 1)
- size (기본값 10)

---

## 응답 예시
```json
{
  "total": 3,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 10,
      "post_id": 1,
      "reply_id": null,
      "content": "저도 공감합니다!",
      "user": { "id": 5, "nickname": "독서맘" },
      "has_replies": true
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
    offset = (page - 1) * size
    base_query = db.query(ReadingForumComments).filter(
        ReadingForumComments.post_id == post_id,
        ReadingForumComments.reply_id.is_(None)
    )

    total = base_query.count()

    comments = (
        base_query
        .order_by(ReadingForumComments.created_at.desc())
        .offset(offset)
        .limit(size)
        .options(joinedload(ReadingForumComments.user))
        .all()
    )

    items = []
    for c in comments:
        reply_count = db.query(ReadingForumComments).filter(
            ReadingForumComments.reply_id == c.id
        ).count()

        has_replies = reply_count > 0

        items.append(
            ReadingForumCommentRead(
                id=c.id,
                post_id=c.post_id,
                reply_id=c.reply_id,
                content=c.content,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=c.user,
                has_replies=reply_count > 0,
                reply_count=reply_count
            )
        )
    return CommentListResponse(
        total=total, page=page, size=size, items=items
    )
@router.get(
    "/posts/{post_id}/comments/{comment_id}/replies",
    response_model=CommentListResponse,
    summary="대댓글 목록 조회 (reply_id = comment_id + 페이지네이션)",
    description="""
특정 댓글에 달린 **대댓글(2단계)** 목록을 조회합니다.

---

## 기능 설명
- reply_id = comment_id 인 대댓글만 반환
- 정렬: 오래된 순 (ASC)
- 3단계 대댓글은 없음 (구조적으로 금지)
- has_replies = false (대댓글 밑에는 댓글 없음)
---

## 쿼리 파라미터
- page (기본값 1)
- size (기본값 10)

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
      "content": "힘내세요!",
      "user": { "id": 7, "nickname": "책좋아아빠" },
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
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    base_query = db.query(ReadingForumComments).filter(
        ReadingForumComments.post_id == post_id,
        ReadingForumComments.reply_id == comment_id
    )

    total = base_query.count()

    replies = (
        base_query
        .order_by(ReadingForumComments.created_at.asc())
        .offset(offset)
        .limit(size)
        .options(joinedload(ReadingForumComments.user))
        .all()
    )

    items = [
        ReadingForumCommentRead(
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
        total=total, page=page, size=size, items=items
    )

# -------------------------------------------------
# 댓글 / 대댓글 생성 (2 depth까지만)
# -------------------------------------------------
@router.post(
"/comments",
response_model=ReadingForumCommentRead,
summary="독서토론 댓글 / 대댓글 작성",
description="""
지정된 게시글 또는 댓글에 대해 댓글을 작성합니다.

Depth 규칙
댓글(1 depth): reply_id = null

대댓글(2 depth): reply_id = 부모 댓글 ID

3 depth 이상(대대댓글) 금지: 대댓글에 또 대댓글 작성 시 차단

주요 기능
로그인한 사용자 본인만 작성 가능
"""
)
def create_comment(
request: ReadingForumCommentCreate,
user: Users = Depends(get_current_user),
db: Session = Depends(get_db),
):
    if not user:
        raise HTTPException(
            status_code=401,
            detail="로그인이 필요합니다."
        )
    # 게시글 존재 여부 확인
    post = db.query(ReadingForumPosts).filter(ReadingForumPosts.id == request.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 존재하지 않습니다.")
        # reply_id가 있을 때만 부모 댓글 확인
    if request.reply_id is not None:
        parent_comment = (
            db.query(ReadingForumComments)
            .filter(ReadingForumComments.id == request.reply_id)
            .first()
        )
        if not parent_comment:
            raise HTTPException(status_code=404, detail="부모 댓글이 존재하지 않습니다.")

        # 부모 댓글이 이미 대댓글(reply_id != None) → 3 depth 시도 → 차단
        if parent_comment.reply_id is not None:
            raise HTTPException(
                status_code=400,
                detail="대댓글에는 대댓글을 작성할 수 없습니다.",
            )
    new_comment = ReadingForumComments(
        post_id=request.post_id,
        reply_id=request.reply_id,
        user_id=user.id,
        content=request.content,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return ReadingForumCommentRead(
    id=new_comment.id,
    post_id=new_comment.post_id,
    reply_id=new_comment.reply_id,
    content=new_comment.content,
    created_at=new_comment.created_at,
    updated_at=new_comment.updated_at,
    user=UserNickname.from_orm(new_comment.user),
    )
# -------------------------------------------------
# 댓글 수정 (작성자 본인만)
# -------------------------------------------------
@router.patch(
    "/comments/{comment_id}",
    response_model=ReadingForumCommentRead,
    summary="독서토론 댓글 수정",
    description="""
특정 댓글 또는 대댓글을 수정합니다.

---

## 🔐 권한
- **작성자 본인만 수정 가능**

---

## 수정 가능 항목
- content (댓글 본문)

---

## 요청 예시
```json
{
  "content": "수정된 댓글 내용입니다."
}
### 응답 예시
```json
{
  "id": 10,
  "post_id": 1,
  "reply_id": null,
  "content": "수정된 댓글입니다.",
  "user": { "id": 3, "nickname": "책읽는엄마" },
  "has_replies": true
}
"""
)
def update_comment(
    comment_id: int,
    request: ReadingForumCommentUpdate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user :
        raise HTTPException(status_code=401,detail="로그인을 해주세요.")
    comment = (
    db.query(ReadingForumComments)
    .options(joinedload(ReadingForumComments.user))
    .filter(ReadingForumComments.id == comment_id)
    .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 존재하지 않습니다.")

    # 본인만 가능
    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="댓글 수정 권한이 없습니다.")

    # 수정 내용 반영
    if request.content is not None:
        comment.content = request.content

    comment.updated_at = datetime.now()
    db.commit()
    db.refresh(comment)

    # 대댓글이 있는지 여부 체크
    has_replies = db.query(ReadingForumComments).filter(
        ReadingForumComments.reply_id == comment.id
    ).count() > 0

    return ReadingForumCommentRead(
        id=comment.id,
        post_id=comment.post_id,
        reply_id=comment.reply_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user=UserNickname.from_orm(comment.user),
        has_replies=has_replies
    )
# -------------------------------------------------
# 댓글 삭제 (작성자 본인만)
# -------------------------------------------------

@router.delete(
"/comments/{comment_id}",
summary="독서토론 댓글 삭제",
description="""
특정 댓글 또는 대댓글을 삭제합니다.

🔐 권한

작성자 본인만 삭제 가능

삭제 시 주의사항

댓글 삭제 시 하위 대댓글도 함께 삭제됨 (DB cascade)

응답 예시
{
  "success": true
}

"""
)
def delete_comment(
    comment_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user :
        raise HTTPException(status_code=401,detail="로그인을 해주세요.")
    comment = (
    db.query(ReadingForumComments)
    .filter(ReadingForumComments.id == comment_id)
    .first()
    )

    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 존재하지 않습니다.")

    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="댓글 삭제 권한이 없습니다.")

    db.delete(comment)
    db.commit()

    return {"success": True}