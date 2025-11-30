from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import CustomerSupportPosts, CustomerSupportComments, Users
from pydantic import BaseModel

router = APIRouter(prefix="/customer-support", tags=["customer-support"])

# ---------------------------------------------
# DB Dependency
# ---------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------
# CATEGORY SETTINGS
# ---------------------------------------------
USER_ALLOWED_CATEGORIES = [
    "payment_error", # 결제 오류
    "report_user", # 유저 신고
    "service_question", # 서비스 문제
    "bug_report",   # 버그 제보
    "etc", #기타 문의
]
class StatusUpdate(BaseModel):
    status: str    # open, in_progress, resolved, closed

FAQ_CATEGORY = "public"

# ---------------------------------------------
# Pydantic Schemas
# ---------------------------------------------
class PostCreate(BaseModel):
    category: str
    title: str
    content: str

class PostUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None

class CommentCreate(BaseModel):
    post_id: int
    reply_id: Optional[int] = None
    content: str

# ==========================================================
# FAQ (공개용)
# ==========================================================
@router.get(
    "/faq",
    summary="FAQ 목록 조회 (공개, 페이지네이션)",
    description="""
FAQ(자주 묻는 질문)를 최신순으로 페이지네이션하여 조회합니다.  
모든 사용자가 접근할 수 있습니다.

---

## 요청 예시
`GET /faq?page=1&size=5`

## 응답 예시
```json
{
  "total_count": 25,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 1,
      "category": "public",
      "title": "결제는 어떻게 하나요?",
      "content": "결제 방법은 ...",
      "created_at": "2025-01-01T12:00:00"
    }
  ]
}
"""
)
async def faq_list(
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    size: int = Query(5, ge=1, le=50, description="페이지 크기 (기본 5, 최대 50)"),
    db: Session = Depends(get_db)
):
    # 전체 개수
    total_count = (
    db.query(CustomerSupportPosts)
    .filter(CustomerSupportPosts.category == FAQ_CATEGORY)
    .count()
    )

    # 페이지 계산
    skip = (page - 1) * size

    # FAQ 조회
    posts = (
        db.query(CustomerSupportPosts)
        .filter(CustomerSupportPosts.category == FAQ_CATEGORY)
        .order_by(CustomerSupportPosts.created_at.desc())
        .offset(skip)
        .limit(size)
        .all()
    )

    return {
        "total_count": total_count,
        "page": page,
        "size": size,
        "items": posts
    }

@router.get("/faq/{post_id}",
    summary="FAQ 상세 조회",
    description="""
    특정 FAQ(공개 게시글)의 상세 내용을 조회합니다.
    
    FAQ는 category='public' 이므로 누구나 접근 가능합니다.
    
    ---
    
    ### 응답 예시
    ```json
    {
      "id": 3,
      "category": "public",
      "title": "환불은 가능한가요?",
      "content": "환불 정책은...",
      "created_at": "2025-01-03T10:00:00"
    }
    """
)
async def faq_detail(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(CustomerSupportPosts)
        .filter(CustomerSupportPosts.id == post_id)
        .filter(CustomerSupportPosts.category == FAQ_CATEGORY)
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다.")
    return post

@router.get("/faq/search",
summary="FAQ 검색",
description="""
FAQ 제목 또는 내용에 주어진 검색어가 포함된 항목을 조회합니다.

- Query
이름	설명
word	검색할 단어
### 응답 예시
```json
[
  {
    "id": 2,
    "title": "결제 실패 해결 방법",
    "content": "카드 오류의 경우...",
    "category": "public"
  }
]

"""
)
async def faq_search(
    word: str, db: Session = Depends(get_db)
):
    posts = (
        db.query(CustomerSupportPosts)
        .filter(CustomerSupportPosts.category == FAQ_CATEGORY)
        .filter(
            (CustomerSupportPosts.title.contains(word)) |
            (CustomerSupportPosts.content.contains(word))
        )
        .order_by(CustomerSupportPosts.created_at.desc())
        .all()
    )
    return posts
# 내 문의 목록 조회
@router.get("/my-posts",
summary="내 문의 목록 조회 (유저 전용)",
description="""
로그인한 사용자가 작성한 문의글 목록을 조회합니다.
FAQ(public)는 제외됩니다.

### 쿼리 파라미터
이름	설명
page	페이지 번호 (기본 1)
size	페이지당 항목 수 (기본 10)
### 응답 예시
```json
{
  "total": 3,
  "page": 1,
  "size": 5,
  "items": [
    {
      "id": 10,
      "category": "payment_error",
      "title": "결제가 안돼요",
      "status": "open",
      "created_at": "2025-01-01T12:00:00"
    }
  ]
}

"""
)
async def get_my_posts(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401,detail="로그인을 다시 해주세요.")
    offset = (page - 1) * size

    base_query = (
        db.query(CustomerSupportPosts)
        .filter(CustomerSupportPosts.user_id == current_user.id)
        .filter(CustomerSupportPosts.category != "public")  # FAQ 제외
    )

    total = base_query.count()

    posts = (
        base_query
        .order_by(CustomerSupportPosts.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": posts
    }


# ==========================================================
# 📌 게시글 (Posts) 생성 — 유저 & 관리자
# ==========================================================
@router.post("/posts",
summary="문의글 생성 (유저/관리자)",
description="""
사용자 또는 관리자가 새로운 문의글을 생성합니다.

📌 카테고리 규칙

- 일반 유저:
payment_error, report_user, service_question, bug_report, etc 만 가능

- 관리자:
public(FAQ) 포함 모든 카테고리 가능
---

### 요청 예시 
```json
{
  "category": "payment_error",
  "title": "결제가 안됩니다",
  "content": "카드 오류가 반복됩니다"
}

```

### 응답 예시
```json
{
  "id": 15,
  "user_id": 3,
  "category": "payment_error",
  "title": "결제가 안됩니다",
  "content": "카드 오류가 반복됩니다"
}
"""
)
async def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401,detail="로그인을 다시 해주세요.")
    # 관리자 여부
    is_admin = current_user.role == "admin"

    # 관리자만 FAQ(public) 생성 가능
    if data.category == "public" and not is_admin:
        raise HTTPException(status_code=403, detail="일반 유저는 public 카테고리를 생성할 수 없습니다.")

    # 일반 유저는 제한된 카테고리만 가능
    if not is_admin and data.category not in USER_ALLOWED_CATEGORIES:
        raise HTTPException(status_code=403, detail="해당 카테고리는 유저가 사용할 수 없습니다.")

    post = CustomerSupportPosts(
        user_id=current_user.id,
        category=data.category,
        title=data.title,
        content=data.content,
        created_at=datetime.now()
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return post
# ==========================================================
# 📌 게시글 조회 (본인 글 또는 공개 글만)
# ==========================================================
@router.get("/posts/{post_id}",
summary="문의글 상세 조회",
description="""
해당 문의글의 내용을 상세 조회합니다.

### 접근 권한
글 종류	접근 권한
FAQ(public)	누구나
일반 문의	본인 + 관리자만

---

### 응답 예시
```json
{
  "id": 44,
  "title": "결제가 안됩니다",
  "category": "payment_error",
  "content": "카드 오류가 뜹니다",
  "status": "in_progress",
  "comments": [
    {
      "id": 10,
      "user_id": 1,
      "role": "admin",
      "content": "해당 오류는 현재 점검 중입니다.",
      "created_at": "2025-01-01T12:00:00",

      "replies": [
        {
          "id": 11,
          "user_id": 3,
          "role": "customer",
          "content": "확인 감사합니다.",
          "created_at": "2025-01-01T12:10:00",
          "replies": []
        }
      ]
    }
  ]
}

"""
)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    # 🔹 1) 게시글 조회
    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    # 🔹 접근 권한 체크
    if post.category != "public":
        if post.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    # 🔹 2) 부모 댓글 조회 (reply_id=None)
    parent_comments = (
        db.query(CustomerSupportComments)
        .filter(
            CustomerSupportComments.post_id == post_id,
            CustomerSupportComments.reply_id.is_(None)
        )
        .order_by(CustomerSupportComments.created_at.asc())
        .all()
    )

    def build_comment_tree(comment):
        """대댓글 트리 재귀 생성, 1:1 질의답변 구조라 상관 없음"""
        return {
            "id": comment.id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "user": {
                "id": comment.user.id,
                "nickname": comment.user.nickname,
                "role": comment.user.role,
            },
            "replies": [
                build_comment_tree(child)
                for child in comment.replies
            ],
        }

    # 🔹 트리 구조 구성
    comment_tree = [build_comment_tree(c) for c in parent_comments]

    # 🔹 최종 응답
    return {
        "id": post.id,
        "category": post.category,
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at,
        "user": {
            "id": post.user.id,
            "nickname": post.user.nickname,
            "role": post.user.role,
        },
        "comments": comment_tree
    }


# ==========================================================
# 게시글 수정 (본인 또는 관리자)
# ==========================================================
@router.patch("/posts/{post_id}",
summary="문의글 수정",
description="""
사용자가 작성한 문의글을 수정합니다.

🔐 접근 규칙

- 본인만 수정 가능
- FAQ(public) 카테고리 변경은 관리자만 가능
- 임의의 카테고리 값으로 변경 불가
- **status가 open(접수됨) 상태일 때만 수정 가능**

### ❗ 수정 가능한 상태
| status | 의미 | 수정 가능 여부 |
|--------|------|----------------|
| open | 접수됨 | ✅ 가능 |
| in_progress | 검토중 | ❌ 불가 |
| closed | 완료됨 | ❌ 불가 |

---

### 요청 예시
```json
{
  "category": "payment_error",
  "title": "문의드립니다 (수정됨)",
  "content": "추가 설명입니다."
}

```

---

### 응답 예시
```json
{  
  "id": 15,
  "category": "payment_error",
  "title": "문의드립니다 (수정됨)",
  "content": "추가 설명입니다."
}

"""
)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    is_admin = current_user.role == "admin"

    # 일반 유저는 본인 글만 수정 가능
    if post.user_id != current_user.id :
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # status가 open이 아닐시 수정 불가
    if post.status != "open":
        raise HTTPException(
            status_code=403,
            detail="현재 상태에서는 수정할 수 없습니다. (open 상태에서만 수정 가능)"
        )

    # public 수정은 관리자만 가능
    if data.category == "public" and not is_admin:
        raise HTTPException(status_code=403, detail="public 카테고리로 변경할 수 없습니다.")

    # 해당하는 category외에 category 임의 값으로 변경 불가
    if data.category not in USER_ALLOWED_CATEGORIES:
        raise HTTPException(status_code=401, detail="해당하는 카테고리를 찾을 수 없습니다.")

    # 데이터 반영
    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content
    if data.category is not None:
        post.category = data.category

    post.updated_at = datetime.now()

    db.commit()
    db.refresh(post)
    return post


# ==========================================================
# 📌 게시글 삭제 (본인 또는 관리자)
# ==========================================================

@router.delete("/posts/{post_id}",
summary="문의글 삭제",
description="""
본인이 작성한 문의글을 삭제합니다.
관리자는 모든 글 삭제 가능.

---

### 응답 예시

```json
{
  "success": true
}
"""
)

async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    is_admin = current_user.role == "admin"

    # 본인 또는 관리자만 삭제 가능
    if post.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    db.delete(post)
    db.commit()

    return {"success": True}

@router.post("/comments", summary="댓글/답글 작성")
async def create_comment(
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    # 게시글 찾기
    post = db.query(CustomerSupportPosts).filter(CustomerSupportPosts.id == data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    # 🔐 접근 권한
    if post.category != "public":
        if post.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    # 🔒 소비자 댓글 제한
    if current_user.role == "customer":
        if post.status not in ("resolved", "closed"):
            raise HTTPException(
                status_code=403,
                detail="관리자 답변이 완료된 후에만 댓글을 작성할 수 있습니다."
            )

    # 대댓글 부모 체크
    if data.reply_id:
        parent = (
            db.query(CustomerSupportComments)
            .filter(CustomerSupportComments.id == data.reply_id)
            .first()
        )
        if not parent:
            raise HTTPException(status_code=404, detail="부모 댓글을 찾을 수 없습니다.")

    # 댓글 생성
    new_comment = CustomerSupportComments(
        post_id=data.post_id,
        user_id=current_user.id,
        content=data.content,
        reply_id=data.reply_id
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {
        "id": new_comment.id,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "reply_id": new_comment.reply_id,
        "user": {
            "id": current_user.id,
            "nickname": current_user.nickname,
            "role": current_user.role
        }
    }
