from typing import Optional
from fastapi import APIRouter, Depends, HTTPException,Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from data.postgresDB import SessionLocal
from models import CustomerSupport
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드

router = APIRouter(prefix="/customer-support", tags=["customer-support"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CustomerSupportCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None  # null이면 질문, 값이 있으면 답변/댓글
    category: Optional[str] = None
    title: Optional[str] = None
    content: str
    status: Optional[str] = "open"

class CustomerSupportResponse(BaseModel):
    id: int
    user_id: int
    parent_id: Optional[int]
    category: Optional[str]
    title: Optional[str]
    content: str
    status: str

    class Config:
        from_attribute = True  # SQLAlchemy 객체를 자동 변환

@router.get("/")
async def customer_support():
    return RedirectResponse(url="/customer-support/list")
# 자주하는 질문 리스트로 넘어가도록
@router.get("/list")
async def customer_support_list(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    size: int = Query(10, ge=1, le=100, description="한 페이지당 항목 수"),
):
    offset = (page - 1) * size

    customer_support_lists = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.parent_id == None)
        .order_by(CustomerSupport.created_at.desc())  # 최신순 정렬 추천
        .offset(offset)
        .limit(size)
        .all()
    )
    return customer_support_lists

@router.get("/list/{list_id}")
async def customer_support_by_id(list_id: int, db: Session = Depends(get_db)):
    try:
        post = db.query(CustomerSupport).filter(CustomerSupport.id == list_id).first()
        if not post:
            return {"message": "존재하지 않는 게시물입니다."}
        return post
    except Exception as e:
        return {"error": f"Error: {e}"}

@router.get("/list/search")
async def customer_support_search_by_word(word: str, db: Session = Depends(get_db)):
    # 제목 검색
    customer_support_title_list = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.title.contains(word))
        .filter(CustomerSupport.parent_id == None)
        .all()
    )
    # 내용 검색
    customer_support_content_list = (
        db.query(CustomerSupport)
        .filter(CustomerSupport.content.contains(word))
        .filter(CustomerSupport.parent_id == None)
        .all()
    )
    # 결과 합치기 (중복 제거 필요하면 set 사용)
    result = customer_support_title_list + customer_support_content_list

    # created_at 기준 최신순 정렬
    result.sort(key=lambda x: x.created_at, reverse=True)

    # id기준 중복 제거
    unique_result = {item.id: item for item in result}.values()
    return sorted(unique_result, key=lambda x: x.created_at, reverse=True)

@router.post("/list",response_model=CustomerSupportResponse)
async def customer_support_create(request: CustomerSupportCreate, db: Session = Depends(get_db)):
    # 1. parent_id가 있으면 부모 글(질문)이 존재하는지 체크
    if request.parent_id:
        parent = db.query(CustomerSupport).filter(CustomerSupport.id == request.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="질문이 없습니다.")

    # 2. 객체 생성
    new_post = CustomerSupport(
        user_id=request.user_id,
        parent_id=request.parent_id,
        category=request.category,
        title=request.title,
        content=request.content,
        status=request.status,
    )
    # 3. DB 저장
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return new_post
@router.patch("/list/{list_id}",response_model=CustomerSupportResponse)
async def customer_support_update(request: CustomerSupportCreate, db: Session = Depends(get_db)):
    list_id=request.parent_id
    if request.parent_id:
        parent = db.query(CustomerSupport).filter(CustomerSupport.id == list_id).first()
        parent.status="resolved"
    else:
        parent = db.query(CustomerSupport).first()
        parent.status="open"
    return parent

@router.delete("/list/{list_id}")
async def customer_support_delete(list_id: int, db: Session = Depends(get_db)):
    try: db.query(CustomerSupport).filter(
        CustomerSupport.id == list_id
    ).delete()
    except Exception as e:
        return {"error": f"Error: {e}"}
    db.commit()
    return {"success": True}