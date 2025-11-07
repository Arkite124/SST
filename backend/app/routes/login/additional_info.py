from fastapi import APIRouter, Depends, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from data.postgresDB import SessionLocal
from models import Users as User
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드

router = APIRouter(prefix="/auth/additional-info", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AdditionalInfo(BaseModel):
    id: int
    nickname: str
    age: int
    gender: str
    phone: str
    email: str

    class Config:
        from_attribute = True  # ORM → Pydantic 변환 허용
@router.get("/")
async def additional_info_form(id:int):
    # React 추가정보 입력 페이지로 바로 리다이렉트
    return RedirectResponse(url=f"http://localhost:5173/users/{id}")