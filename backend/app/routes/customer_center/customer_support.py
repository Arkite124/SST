from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import CustomerSupport, Users
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/customer-support", tags=["customer-support"])

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
class CustomerSupportCreate(BaseModel):
    parent_id: Optional[int] = None
    category: Optional[str] = None
    title: Optional[str] = None
    content: str
    status: Optional[str] = "open"


class CustomerSupportUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


class CustomerSupportResponse(BaseModel):
    id: int
    user_id: int
    parent_id: Optional[int]
    category: Optional[str]
    title: Optional[str]
    content: str
    status: str

    class Config:
        from_attributes = True


# -------------------------------------------------
# 기본 페이지 Redirect
# -------------------------------------------------
@router.get("/")
async def customer_support():
    return RedirectResponse(url="/customer-support/list")


# -------------------------------------------------
# 📌 전체 고객센터 질문 목록(FAQ용)
# -------------------------------------------------
@router.get(
    "/list",
    summary="고객센터 FAQ 목록 조회",
    description="""
공개(public) 카테고리의 고객센터 부모 게시글(FAQ) 목록을 조회합니다.

### 주요 기능
- 공개(public) 카테고리만 조회
- 부모 글만 조회 (`parent_id IS NULL`)
- 최신순 정렬(created_at DESC)
- 페이지네이션 제공

### Query Parameters
- `page`: 페이지 번호 (기본값 1)
- `size`: 페이지당 항목 수 (기본값 10)
"""
)
async def customer_support_list(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=100, description="한 페이지당 개수")
):
    offset = (page - 1) * size
    items = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.parent_id == None)
        .filter(CustomerSupport.category=="public")
        .order_by(CustomerSupport.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    return items

# -------------------------------------------------
# 📌 단일 고객센터 질문 조회
# -------------------------------------------------
@router.get(
    "/list/{list_id}",
    summary="FAQ 상세 조회",
    description="""
FAQ 단일 게시글을 ID로 조회합니다.

### 주요 기능
- 공개된 고객센터 글만 조회
- 존재하지 않을 경우 404 반환
"""
)
async def customer_support_by_id(list_id: int, db: Session = Depends(get_db)):
    post = db.query(CustomerSupport).filter(CustomerSupport.id == list_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시물입니다.")

    return post


# -------------------------------------------------
# 📌 검색 (제목 + 내용 검색)
# -------------------------------------------------
@router.get(
    "/list/search",
    summary="FAQ 검색",
    description="""
FAQ(공개 고객센터 게시물)에서 제목 또는 내용에 검색어가 포함된 글을 조회합니다.

### 주요 기능
- 제목/내용 각각 검색 후 결과 병합
- 부모 글만 조회 (`parent_id IS NULL`)
- 공개 카테고리(public)만 대상, 자주 묻는 질문 (category=="public")
- 최신순 정렬
- 중복 제거
"""
)
async def customer_support_search_by_word(
    word: str,
    db: Session = Depends(get_db)
):
    title_list = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.title.contains(word))
        .filter(CustomerSupport.category == "public")
        .filter(CustomerSupport.parent_id == None)
        .all()
    )

    content_list = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.content.contains(word))
        .filter(CustomerSupport.category == "public")
        .filter(CustomerSupport.parent_id == None)
        .all()
    )

    combined = title_list + content_list
    combined.sort(key=lambda x: x.created_at, reverse=True)

    unique_items = {item.id: item for item in combined}.values()
    return sorted(unique_items, key=lambda x: x.created_at, reverse=True)

# ============================================================
# ⛔ 개인 고객센터 (로그인 사용자 기반 CRUD)
# ============================================================

# -------------------------------------------------
# ⭐ CREATE - 로그인 사용자 문의 작성
# -------------------------------------------------
@router.post(
    "/my",
    response_model=CustomerSupportResponse,
    summary="내 문의글 작성",
    description="""
로그인한 사용자의 고객센터 문의글을 생성합니다.

### 주요 기능
- parent_id가 있으면 '답글 형태 문의'로 저장
- category, title, content, status 저장 가능
- `created_at` 자동 설정
"""
)
async def customer_support_create_my(

    request: CustomerSupportCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    user_id = current_user.id
    # parent_id 검증
    if request.parent_id:
        parent = db.query(CustomerSupport).filter(CustomerSupport.id == request.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="부모 글이 없습니다.")

    new_post = CustomerSupport(
        user_id=user_id,
        parent_id=request.parent_id,
        category=request.category,
        title=request.title,
        content=request.content,
        status=request.status,
        created_at=datetime.now()
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

# -------------------------------------------------
# ⭐ READ LIST - 로그인 사용자의 문의 전체 목록
# -------------------------------------------------
@router.get(
    "/my",
    summary="내 문의글 목록 조회",
    description="""
로그인한 사용자의 고객센터 문의글 목록을 조회합니다.

### 주요 기능
- 부모글만 조회 (`parent_id IS NULL`)
- 최신순(created_at DESC)
- 페이지네이션 제공

### Response 구조
```json
{
  "items": [...],
  "total": 12,
  "page": 1,
  "size": 10,
  "pages": 2
}
"""
)
async def customer_support_my_list(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    user_id = current_user.id
    offset = (page - 1) * size

    my_questions = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.user_id == user_id)
        .filter(CustomerSupport.parent_id == None)
        .order_by(CustomerSupport.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    total = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.user_id == user_id)
        .filter(CustomerSupport.parent_id == None)
        .count()
    )

    pages = (total + size - 1) // size

    return {
        "items": my_questions,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# -------------------------------------------------
# ⭐ READ DETAIL - 내 특정 문의 + 답변 조회
# -------------------------------------------------
@router.get(
    "/my/{question_id}",
    summary="내 문의글 상세 조회 (답변 포함)",
    description="""
로그인한 사용자가 작성한 특정 문의글을 조회하고,  
해당 글에 달린 관리자 답변(자식 댓글) 목록을 함께 반환합니다.

### 주요 기능
- 부모글 조회
- 해당 parent_id를 가진 모든 답변 목록 조회
- 오래된 순으로 정렬
"""
)
async def customer_support_my_detail(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    user_id = current_user.id

    question = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.id == question_id)
        .filter(CustomerSupport.user_id == user_id)
        .filter(CustomerSupport.parent_id == None)
        .first()
    )

    if not question:
        raise HTTPException(status_code=404, detail="문의글을 찾을 수 없습니다.")

    answers = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.parent_id == question_id)
        .order_by(CustomerSupport.created_at.asc())
        .all()
    )

    return {"question": question, "answers": answers}


# -------------------------------------------------
# ⭐ UPDATE - 내가 작성한 문의 수정
# -------------------------------------------------
@router.patch(
    "/my/{question_id}",
    response_model=CustomerSupportResponse,
    summary="내 문의글 수정",
    description="""
로그인한 사용자의 문의글을 수정합니다.

### 주요 기능
- 제목, 내용, 카테고리, 상태 수정 가능
- 작성자 본인만 수정 가능
- 수정 시 `updated_at` 자동 갱신
"""
)
async def customer_support_update_my(
    question_id: int,
    request: CustomerSupportUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    user_id = current_user.id

    post = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.id == question_id)
        .filter(CustomerSupport.user_id == user_id)
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="수정할 문의글을 찾을 수 없습니다.")

    if request.title is not None:
        post.title = request.title
    if request.content is not None:
        post.content = request.content
    if request.category is not None:
        post.category = request.category
    if request.status is not None:
        post.status = request.status

    post.updated_at = datetime.now()

    db.commit()
    db.refresh(post)
    return post


# -------------------------------------------------
# ⭐ DELETE - 내가 작성한 문의 삭제
# -------------------------------------------------
@router.delete(
    "/my/{question_id}",
    summary="내 문의글 삭제",
    description="""
로그인한 사용자가 작성한 고객센터 문의글을 삭제합니다.

### 주요 기능
- 부모 문의글 삭제 시 그에 달린 답변(자식 글)도 함께 삭제
- 삭제 성공 시 `{ "success": true , "message": "문의글이 삭제되었습니다."}` 반환
"""
)
async def customer_support_delete_my(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    user_id = current_user.id

    post = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.id == question_id)
        .filter(CustomerSupport.user_id == user_id)
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="삭제할 문의글을 찾을 수 없습니다.")

    # 자식 답변 삭제
    db.query(CustomerSupport).filter(CustomerSupport.parent_id == question_id).delete()

    db.delete(post)
    db.commit()

    return {"success": True, "message": "문의글이 삭제되었습니다."}
