from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from data.postgresDB import SessionLocal
from models import Users as User
from jose import jwt
import os
from datetime import datetime, timedelta
from app.routes.login.login import get_current_user   # 🔥 추가

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

def create_access_token(user_id: int, expires_minutes: int = 60):
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int):
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": str(user_id), "exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/")
async def save_additional_info(
    data: AdditionalInfo,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 🔥 여기서 유저 가져옴
):

    # 1) 현재 로그인된 유저 기준 조회
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2) 이미 정보가 있으면 막기
    if user.nickname:
        raise HTTPException(status_code=400, detail="추가정보가 이미 등록된 사용자입니다.")

    # 3) 정보 업데이트
    user.nickname = data.nickname
    user.age = data.age
    user.gender = data.gender
    user.phone = data.phone
    user.updated_at = datetime.now()

    db.commit()
    db.refresh(user)

    # 4) 새로운 JWT 발급
    access_token = create_access_token(user.id)
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
        max_age=3600 * 24 * 7
    )

    return response
