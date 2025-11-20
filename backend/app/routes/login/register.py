import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import Users as User
from data.postgresDB import SessionLocal
from app.routes.edit_user.edit_user import UserRead

load_dotenv()  # .env 파일 자동 로드
router = APIRouter(prefix="/auth", tags=["register"])   # ✅ 모듈별 라우터

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
SECRET_KEY=os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"

class UserRegister(BaseModel):
    id: Optional[int]=None
    name: str
    password: Optional[str] = None
    nickname: Optional[str] = None
    age: int
    gender: Optional[str] = None
    phone: Optional[str] = None
    oauth: Optional[str] = None
    email: str

    class Config:
        from_attributes = True

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

@router.post(
    "/register",
    response_model=UserRead,
    summary="회원가입",
    description="""
새로운 사용자를 회원가입 처리합니다.

### 주요 기능
- 이메일(email) 중복 체크
- 비밀번호 해싱 후 안전하게 저장 (bcrypt 사용)
- 이름, 닉네임, 성별, 나이, 전화번호 등 기본 프로필 정보 저장
- 회원가입 성공 시 생성된 사용자 정보를 반환합니다.

### Request Body 예시
```json
{
  "name": "홍길동",
  "password": "example1234" -> 해시화 되서 DB에 저장,
  "nickname": "길동이",
  "age": 12,
  "gender": "male",
  "phone": "010-1234-5678",
  "email": "test@example.com"
}""")
def register(data: UserRegister, db: Session = Depends(get_db)):
    # 이메일 중복 검사
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # ✅ 비밀번호 해시
    hashed_pw = hash_password(data.password)

    user = User(
        email=data.email,
        name=data.name,
        password=hashed_pw,   # 해시된 비밀번호 저장
        nickname=data.nickname,
        phone=data.phone,
        gender=data.gender,
        age=data.age,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user