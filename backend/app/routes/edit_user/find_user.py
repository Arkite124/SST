import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt,JWTError
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import Users
from data.postgresDB import SessionLocal
from typing import Optional

load_dotenv()  # .env 파일 자동 로드
# 유저 정보
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
class UserRead(BaseModel):
    id: int
    nickname: str
    phone: str
    email : str

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: str

    class Config:
        from_attributes = True

@router.get("/{phone}", response_model=UserRead)
def find_user(phone: str, db: Session = Depends(get_db)):
    """
    유저 이메일 찾는 라우터(핸드폰 번호 기반)
    """
    user = db.query(Users).filter(Users.phone == phone).first()
    if not user or user.phone is None:
        raise HTTPException(status_code=200, detail="해당 번호를 가진 유저를 찾지 못했습니다.")
    if user.oauth is not None:
        return {"message":f"당신은 {user.oauth}로 소셜회원가입 되어 있습니다."}
    return {"message":f"당신의 이메일은 {user.email}입니다.\n {user.nickname}님 비밀번호 재설정을 하시겠습니까?"}

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "ghkddudwnd@gmail.com"
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # Gmail은 앱 비밀번호 필요

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

aws_url=os.getenv("AWS_URL")

# 1. 비밀번호 재설정 요청
@router.post("/pw_reset/request")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    비밀번호 재설정 요청
    """
    user = db.query(Users).filter(Users.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.now() + timedelta(minutes=15)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    reset_link = f"{aws_url}/pw_reset?token={token}"

    # SMTP 이메일 발송
    subject = "비밀번호 재설정 안내"
    body = f"""
    안녕하세요 {user.name}님,

    비밀번호 재설정을 요청하셨다면 아래 링크를 클릭하세요:
    
    {reset_link}

    이 링크는 15분 동안만 유효합니다.
    """
    send_email(data.email, subject, body)

    return {"message": "비밀번호 재설정 메일이 전송되었습니다."}


def send_email(to_email: str, subject: str, body: str):
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()  # TLS 암호화
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

# 2. 비밀번호 재설정 완료
@router.post("/pw_reset/confirm")
def confirm_password_reset(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    비밀번호 재설정 확인
    """
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = pwd_context.hash(data.new_password)
    db.commit()
    return {"message": "비밀번호 변경이 완료되었습니다."}