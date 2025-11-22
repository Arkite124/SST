from models import Users as User
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import Cookie, Depends, HTTPException, APIRouter,status,Request
from fastapi.responses import RedirectResponse, JSONResponse
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
from jose import jwt, JWTError

from data.postgresDB import SessionLocal

load_dotenv()  # .env 파일 자동 로드
router = APIRouter(prefix="/auth", tags=["login"])

class LoginSchema(BaseModel):
    email:str
    password: str
SECRET_KEY=os.environ.get("SECRET_KEY")
REFRESH_SECRET_KEY=os.environ.get("REFRESH_SECRET_KEY")

def create_access_token(user_id: int, expires_delta: int = 60):
    expire = datetime.now() + timedelta(minutes=expires_delta)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int, expires_days: int = 7):
    expire = datetime.now() + timedelta(days=expires_days)
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

def get_current_user(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        return None
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        return None
    except Exception:
        return None
    user=db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_admin_user(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 전용 페이지입니다.")
    return user

@router.get("/me")
def profile_data(user=Depends(get_current_user)):
    # 로그인 안 된 경우: 200 OK + null 반환
    if user is None:
        return JSONResponse(content={"user": None}, status_code=200)
    # 로그인 된 경우: 유저 정보 반환
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "nickname": user.nickname,
            "role": user.role,
            "vocabulary_age": user.vocabulary_age,
        }
    }
# 로그인 상태 유지
@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="존재하지 않는 계정이거나 비밀번호가 틀렸습니다.")
    # ✅ 소셜 로그인 유저는 비밀번호 없음
    if user.oauth:
        raise HTTPException(status_code=400, detail=f"소셜 {user.oauth} 로그인을 사용하세요")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="이메일이나 비밀번호가 틀렸습니다.")

    # JWT 발급 - 10/01 추가 refresh_token 추가
    access_token = create_access_token(user.id, expires_delta=60)   # 1시간짜리
    refresh_token = create_refresh_token(user.id, expires_days=7)  # 7일짜리
    response = JSONResponse({"access_token": "JWT암호화","토큰 형식":"bearer"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,   # 개발용 HTTPS 설정, 지금은 False
        samesite="lax",    # 크로스 도메인 허용
        max_age=3600,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,   # 개발용 HTTPS 설정, 지금은 False
        samesite="lax",    # 크로스 도메인 허용
        max_age=3600*24*7,
    )
    return response

@router.post("/refresh")
def refresh_tokens(refresh_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # DB에서 유저 확인
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 새 access token 발급
    new_access_token = create_access_token(user.id, expires_delta=60)
    response = JSONResponse({"msg": "Token refreshed"})
    response.set_cookie("access_token", new_access_token, httponly=True, max_age=900)
    return response

@router.post("/logout")
def logout(request: Request):
    response = JSONResponse({"message": "로그아웃 성공"})
    response.set_cookie("access_token", "", httponly=True, max_age=0)
    response.set_cookie("refresh_token", "", httponly=True, max_age=0)
    # delete가 먹히지 않아도 쿠키의 max_age=0으로 해서 삭제시키기 위함
    request.session.clear()
    return response