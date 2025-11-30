from typing import Optional

from models import Users as User, Users
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

def create_access_token(user_id: int, expires_minutes: int = 60):
    expire = datetime.now() + timedelta(minutes=expires_minutes)
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
        user = db.query(User).filter(User.id == user_id).first()
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

@router.get(
    "/me",
    summary="현재 로그인된 사용자 정보 조회",
    description="""
현재 로그인된 사용자의 정보를 반환합니다.

### 주요 기능
- 로그인 상태가 아닐 경우: `{"user": null}` 반환
- 로그인 상태일 경우: id, email, name, nickname, role 등 기본 정보 반환
"""
)
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
@router.post(
    "/login",
    summary="이메일 및 비밀번호 로그인",
    description="""
일반 계정(로컬 계정)의 이메일과 비밀번호로 로그인합니다.

### 주요 기능
- 이메일 존재 여부 확인
- 소셜 로그인 계정인지 확인 (소셜 계정은 패스워드 로그인 불가)
- 비밀번호 검증 (bcrypt)
- 로그인 성공 시:
  - access_token (1시간)
  - refresh_token (7일)
  을 **HTTP-Only Cookie**로 발급

### Response
- access_token / refresh_token은 쿠키로 전달
- Body에는 `"access_token": "JWT암호화"` 형식의 예시만 반환
"""
)
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
    access_token = create_access_token(user.id, expires_minutes=60)   # 1시간짜리
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

@router.post(
    "/refresh",
    summary="Access Token 재발급",
    description="""
HTTP-Only 쿠키에 포함된 refresh_token을 사용하여 **새로운 access_token**을 발급합니다.

### 주요 기능
- refresh_token 유효성 검증
- 만료되었거나 위조된 토큰인 경우 401 반환
- 정상적인 refresh_token일 경우:
  - 새로운 access_token 발급 및 쿠키에 저장

### 주의사항
- refresh_token 자체는 다시 재발급하지 않습니다.
"""
)
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
    new_access_token = create_access_token(user.id, expires_minutes=60)
    response = JSONResponse({"msg": "Token refreshed"})
    response.set_cookie("access_token", new_access_token, httponly=True, max_age=900)
    return response

class AdditionalInfo(BaseModel):
    token: str
    nickname: str
    age: int
    gender: str
    phone: str
    key_parent: Optional[str] = None

@router.post("/social")
async def save_additional_info(data: AdditionalInfo, db: Session = Depends(get_db)):
    """
    소셜로그인 최초 등록시 추가정보를 입력받아 저장하는 엔드포인트 입니다.
    """
    payload = jwt.decode(data.token, SECRET_KEY, algorithms=["HS256"])
    if payload.get("type") != "social_signup":
        raise HTTPException(400, "유효하지 않은 접근입니다.")

    user_id = payload["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "유저를 찾을 수 없습니다.")

    # 2) 이미 정보가 있으면 중복 방지
    if user.nickname:
        raise HTTPException(status_code=400, detail="추가정보가 이미 등록된 사용자입니다.")
    if data.age < 0 :
        raise HTTPException(status_code=400, detail="나이는 음수가 될 수 없습니다.")
    # 3) 정보 업데이트
    user.nickname = data.nickname
    user.age = data.age
    user.gender = data.gender
    user.phone = data.phone
    user.updated_at = datetime.now()
    # ⭐ key_parent가 있으면 bcrypt로 암호화 후 저장
    if data.key_parent:
        user.key_parent = pwd_context.hash(data.key_parent)

    db.commit()
    db.refresh(user)

    # 4) JWT 발급해서 자동 로그인 상태 만들기
    access_token = create_access_token(user.id, expires_minutes=60)
    refresh_token = create_refresh_token(user.id, expires_days=7)

    response = JSONResponse({"message": "추가정보 저장 완료", "user_id": user.id})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600*24*7
    )

    return response
@router.post(
    "/logout",
    summary="로그아웃",
    description="""
현재 로그인된 사용자의 세션을 종료하고 쿠키를 초기화합니다.

### 주요 기능
- access_token 쿠키 삭제
- refresh_token 쿠키 삭제
- 서버 세션(request.session) 초기화
- 완전한 로그아웃 처리
"""
)
def logout(request: Request):

    response = JSONResponse({"message": "로그아웃 성공"})
    response.set_cookie("access_token", "", httponly=True, max_age=0)
    response.set_cookie("refresh_token", "", httponly=True, max_age=0)
    # delete가 먹히지 않아도 쿠키의 max_age=0으로 해서 삭제시키기 위함
    request.session.clear()
    return response