from fastapi import APIRouter,HTTPException,Depends,Request,Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from sqlalchemy import text
from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Users, UserGames, DailyWritings, ReadingLogs, UserTests
import os

router = APIRouter(prefix="/parent", tags=["parent-dashboard"])

# ✅ 환경변수 (실서비스에서는 .env에 넣기)
SECRET_KEY = os.getenv("PARENT_SECRET_KEY", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1시간

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT 발급 함수
def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    expire = datetime.now() + timedelta(minutes=expires_delta)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class ParentKeyInput(BaseModel):
    parent_key: str

# JWT 검증 함수
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
class ParentLoginSchema(BaseModel):
    parent_key: str
# ✅ 부모 로그인
# ✅ 부모 로그인 (자녀 계정 로그인 상태 필요)

@router.post(
    "/login",
    summary="부모 로그인 (Parent Key 인증)",
    description="""
자녀 계정에 저장된 `parent_key` 를 이용해 부모로 로그인합니다.  
로그인 성공 시 `parent_token` 이라는 별도 JWT 쿠키를 발급합니다.

### 주요 기능
- 반드시 **자녀 계정이 로그인된 상태**여야 함 (`get_current_user`)
- parent_key는 bcrypt로 저장되어 있으며 검증 필요
- parent_token은 **HTTP-Only 쿠키**로 발급됨 (XSS 방지)
- 토큰에는 `"parent": true` 포함 → 부모 권한 인증 용도

### Request Body 예시
```json
{
  "parent_key": "abcd1234" -> 해시화된 암호값으로 감
}```
Response 예시
```json
{
  "parent_token": "jwt.token.value",
  "token_type": "bearer",
  "user_id": 5
}
"""
)
def parent_login(
    payload: ParentLoginSchema,
    current_user: Users = Depends(get_current_user),   # ✅ 여기서 주입받음
    db: Session = Depends(get_db),
    response: Response = None
):
    parent_key = payload.parent_key
    user_id = current_user.id   # Users 객체에서 id 꺼내기

    if not current_user:
        raise HTTPException(status_code=401, detail="로그인 여부를 확인해주세요.")
    if not current_user.key_parent or not pwd_context.verify(parent_key, current_user.key_parent):
        raise HTTPException(status_code=403, detail="Invalid parent key")

    token = create_access_token({"sub": str(user_id), "parent": True})

    response.set_cookie(
        key="parent_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600,
    )
    return {
        "parent_token": token,
        "token_type": "bearer",
        "user_id": user_id
    }


@router.get(
    "/me",
    summary="현재 부모 로그인 상태 조회",
    description="""
부모 대시보드 전용 토큰(`parent_token`)이 유효한지 확인하고  
현재 부모 권한으로 로그인 중인지 조회합니다.

### 주요 기능
- parent_token이 없거나 만료 → `{ "role": null }` 반환
- parent_token 유효 → 부모 정보 반환

### Response 예시
성공:
```json
{
  "parent": {
    "parent_id": 3,
    "nickname": "엄마",
    "email": "mom@example.com",
    "role": "parent"
  }
}```
로그인 안됨:

```json
{
  "role": null
}
"""
)
def get_parent_me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("parent_token")
    # 토큰이 없으면 null 반환
    if not token:
        return {"role": None}
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        parent_id = payload.get("sub")
        if not parent_id:
            return {"role": None}
        user = db.query(Users).filter(Users.id == parent_id).first()
        if not user:
            return {"role": None}
        return {
            "parent": {
                "parent_id": user.id,
                "nickname": user.nickname,
                "email": user.email,
                "role": "parent",
            }
        }
    # 오류 상황에서도 null 반환
    except JWTError:
        return {"role": None}

@router.post(
    "/logout",
    summary="부모 로그아웃",
    description="""
부모 전용 토큰(`parent_token`)을 삭제하여 부모 대시보드 인증을 종료합니다.

### 주요 기능
- parent_token을 빈 값 + `max_age=0` 으로 설정해 즉시 만료
- Body는 간단한 메시지만 반환

### Response 예시
```json
{
  "message": "로그아웃 성공"
}
"""
)
def logout():
    response = JSONResponse({"message": "로그아웃 성공"})
    response.set_cookie("parent_token", "", httponly=True, max_age=0)
    # delete가 먹히지 않아도 쿠키의 max_age=0으로 해서 삭제시키기 위함
    return response