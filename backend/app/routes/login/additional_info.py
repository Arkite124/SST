from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from data.postgresDB import SessionLocal
from models import Users as User
from jose import jwt
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth/additional-info", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AdditionalInfo(BaseModel):
    nickname: str
    age: int
    gender: str
    phone: str

    class Config:
        from_attribute = True  # ORM → Pydantic 변환 허용
def create_access_token(user_id: int, expires_minutes: int = 60):
    expire = datetime.now() + timedelta(minutes=expires_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int):
    expire = datetime.now() + timedelta(days=7)
    return jwt.encode({"sub": str(user_id), "exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/")
async def save_additional_info(data: AdditionalInfo, db: Session = Depends(get_db)):
    """
    소셜로그인 최초 등록시 추가정보를 입력받아 저장하는 엔드포인트 입니다.
    """
    # 1) 이메일로 사용자 찾기
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2) 이미 정보가 있으면 중복 방지
    if user.nickname:
        raise HTTPException(status_code=400, detail="추가정보가 이미 등록된 사용자입니다.")

    # 3) 정보 업데이트
    user.nickname = data.nickname
    user.age = data.age
    user.gender = data.gender
    user.phone = data.phone
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    # 4) JWT 발급해서 자동 로그인 상태 만들기
    access_token = create_access_token(user.id, expires_minutes=60)
    refresh_token = create_refresh_token(user.id)

    response = JSONResponse({"message": "추가정보 저장 완료", "user_id": user.id})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="none",
        max_age=3600
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="none",
        max_age=3600*24*7
    )

    return response