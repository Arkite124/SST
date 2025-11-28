from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from app.routes.admin.admin_dashboard import get_current_admin, get_db
from models import CustomerSupportPosts, CustomerSupportComments, Users
from pydantic import BaseModel

router = APIRouter(prefix="/admin/customer-support", tags=["customer-support-admin"])
# ============================================
# Status Schema
# ============================================
class StatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed


# ============================================
# 📌 1. 관리자 전체 문의 목록 조회 + 필터 + 검색
# ============================================
@router.get("/posts",
    summary="전체 문의 목록 조회 (관리자)",
    description="""
관리자 대시보드에서 **모든 문의 목록을 페이징 형태로 조회**합니다.

## 제공 기능
- 전체 문의 조회
- 검색 (제목/내용)
- 카테고리 필터
- 상태 필터
- 사용자별 필터(user_id)
- 정렬 옵션:
  - latest: 최신순(기본)
  - oldest: 오래된순
  - answered: 답변 완료된 항목 우선
  - unanswered: 답변 미완료 항목 우선
- 페이지네이션 지원

---

## 쿼리 파라미터(선택적)

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `page` | int | 페이지 번호 |
| `size` | int | 페이지당 항목 수 |
| `word` | str | 검색어(제목/내용) |
| `category` | str | 카테고리 필터 |
| `status` | str | open/in_progress/resolved/closed |
| `user_id` | int | 특정 유저 문의만 조회 |
| `sort` | str | latest / oldest / answered / unanswered |

---

## 응답 예시
```json
{
  "total": 42,
  "page": 1,
  "size": 20,
  "items": [
    {
      "id": 10,
      "user_id": 3,
      "category": "payment_error",
      "title": "결제 오류가 발생합니다",
      "content": "카드 승인 실패라고 나와요",
      "status": "open",
      "created_at": "2025-01-01T10:00:00",
      "updated_at": "2025-01-01T10:00:00"
    }
  ]
}
""",
)
async def admin_get_all_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    word: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    sort: Optional[str] = Query("latest", description="latest/oldest/answered/unanswered"),
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    offset = (page - 1) * size
    query = db.query(CustomerSupportPosts)

    # 🔍 검색
    if word:
        query = query.filter(
            CustomerSupportPosts.title.contains(word) |
            CustomerSupportPosts.content.contains(word)
        )

    # 📌 카테고리 필터
    if category:
        query = query.filter(CustomerSupportPosts.category == category)

    # 📌 상태 필터
    if status:
        query = query.filter(CustomerSupportPosts.status == status)

    # 📌 특정 유저 글만
    if user_id:
        query = query.filter(CustomerSupportPosts.user_id == user_id)

    total = query.count()

    # 📌 정렬 옵션
    if sort == "latest":
        query = query.order_by(CustomerSupportPosts.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(CustomerSupportPosts.created_at.asc())
    elif sort == "answered":
        query = query.order_by(CustomerSupportPosts.status == "resolved")
    elif sort == "unanswered":
        query = query.order_by(CustomerSupportPosts.status != "resolved")

    posts = query.offset(offset).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": posts
    }

# ============================================
# 📌 2. 관리자 문의 상세 조회
# ============================================
@router.get("/posts/{post_id}",
    summary="문의 상세 조회 (관리자)",
    description="""
    관리자가 특정 문의의 상세 내용을 조회합니다.
    해당 문의에 달린 모든 관리자 답변(댓글) 도 함께 반환합니다.
    
    ### 응답 예시
    ```json
    {
      "post": {
        "id": 10,
        "user_id": 3,
        "category": "payment_error",
        "title": "결제가 안됩니다",
        "content": "계속 실패합니다",
        "status": "open",
        "created_at": "2025-01-01T10:00:00"
      },
      "comments": [
        {
          "id": 5,
          "post_id": 10,
          "user_id": 1,
          "content": "확인 중입니다.",
          "created_at": "2025-01-01T11:00:00"
        }
      ]
    }
    """,
    )
async def admin_get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

    post = (
        db.query(CustomerSupportPosts)
        .filter(CustomerSupportPosts.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")

    comments = (
        db.query(CustomerSupportComments)
        .filter(CustomerSupportComments.post_id == post_id)
        .order_by(CustomerSupportComments.created_at.asc())
        .all()
    )

    return {
        "post": post,
        "comments": comments
    }


# ============================================
# 📌 3. 문의 상태 변경
# ============================================
@router.patch("/posts/{post_id}/status", summary="문의 상태 변경 (관리자)",
description="""
관리자가 특정 문의의 상태(status)를 변경합니다.

### 상태값 목록
open-신규 문의
in_progress-처리 중
resolve-답변 완료
closed-종료됨
###요청 예시
```json
{
  "status": "resolved"
}```

###응답 예시
```json
{
  "success": true,
  "new_status": "resolved"
}
""",
)
async def admin_update_post_status(
    post_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == post_id).first()
    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")

    if data.status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(400, "유효하지 않은 상태값입니다.")

    post.status = data.status
    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)

    return {"success": True, "new_status": post.status}


# ============================================
# 📌 4. 문의 삭제
# ============================================
@router.delete("/posts/{post_id}",
    summary="문의 삭제 (관리자)",
    description="""
    관리자가 특정 문의를 완전히 삭제합니다.
    삭제 시 관련 댓글도 함께 삭제됩니다.
    
    ###응답 예시
    ```json
    {
      "success": true
    }
    
    
    """,
    )
async def admin_delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == post_id).first()

    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")

    db.delete(post)
    db.commit()

    return {"success": True}


# ============================================
# 📌 5. 관리자 댓글(답변) 작성
# ============================================
class AdminCommentCreate(BaseModel):
    post_id: int
    reply_id: Optional[int] = None
    content: str


@router.post("/comments",
    summary="관리자 답변 작성",
    description="""
관리자가 특정 문의에 대해 답변(댓글)을 작성합니다.

답변 작성 시 문의 상태가
open 또는 in_progress → 자동으로 resolved 로 변경됩니다.

###요청 예시
```json
{
  "post_id": 10,
  "content": "확인 후 처리 완료되었습니다."
}```

###응답 예시
```json
{
  "id": 5,
  "post_id": 10,
  "user_id": 1,
  "content": "확인 후 처리 완료되었습니다.",
  "created_at": "2025-01-01T12:00:00"
}```

""",
)
async def admin_create_comment(
    data: AdminCommentCreate,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    # 문의 존재 확인
    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == data.post_id).first()
    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")

    # 댓글 생성
    comment = CustomerSupportComments(
        post_id=data.post_id,
        reply_id=data.reply_id,
        user_id=current_admin.id,
        content=data.content,
        created_at=datetime.utcnow()
    )

    db.add(comment)

    # 🔥 관리자 댓글이 달리면 상태 자동 변경
    if post.status in ("open", "in_progress"):
        post.status = "resolved"
        post.updated_at = datetime.now()

    db.commit()
    db.refresh(comment)

    return comment


# ============================================
# 6. 관리자 댓글 삭제
# ============================================
@router.delete("/comments/{comment_id}",
    summary="관리자 댓글 삭제",
    description="""
    관리자가 특정 댓글(답변)을 삭제합니다.
    
    응답 예시
    ```json
    {
      "success": true
    }
    
    """,
    )
async def admin_delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    comment = db.query(CustomerSupportComments).filter(CustomerSupportComments.id == comment_id).first()

    if not comment:
        raise HTTPException(404, "댓글을 찾을 수 없습니다.")

    db.delete(comment)
    db.commit()

    return {"success": True}


# ============================================
# 7. 관리자 댓글 목록 조회
# ============================================
@router.get("/comments",
    summary="관리자 댓글 목록 조회",
    description="""
    관리자가 특정 문의에 달린 모든 댓글(답변) 을 조회합니다.
    
    쿼리 파라미터
    이름	설명
    post_id	댓글을 조회할 게시글 ID
    ### 응답 예시
    ```json
    [
      {
        "id": 5,
        "post_id": 10,
        "content": "처리되었습니다.",
        "created_at": "2025-01-01T12:00:00"
      }
    ]```
    """,
)
async def admin_get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")

    comments = (
        db.query(CustomerSupportComments)
        .filter(CustomerSupportComments.post_id == post_id)
        .order_by(CustomerSupportComments.created_at.asc())
        .all()
    )
    return comments
