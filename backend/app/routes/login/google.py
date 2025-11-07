import httpx
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
import os
from models import Users as User
from data.postgresDB import SessionLocal
from dotenv import load_dotenv
from typing import Any, Optional
from app.routes.login.login import create_access_token, create_refresh_token

load_dotenv()
router = APIRouter(prefix="/auth/google", tags=["google"])
oauth = OAuth()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

# ✅ OAuth 설정
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/login")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)

    id_token = token.get("id_token")
    user_info: Optional[dict[str, Any]] = None

    if id_token:
        # Google에서 내려준 id_token의 클레임 읽기
        from jose import jwt
        user_info = jwt.get_unverified_claims(id_token)
    else:
        # Fallback - userinfo endpoint 요청
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token['access_token']}"},
            )
            user_info = resp.json()
    #         {sentiment:"긍정"}
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    # ✅ DB 조회
    user = db.query(User).filter(User.email == user_info["email"]).first()
    if not user:
        # 신규 회원이면 추가정보 입력 페이지로 리다이렉트
        user = User(email=user_info["email"], name=user_info.get("name"), oauth="google")
        db.add(user)
        db.commit()
        db.refresh(user)
        return RedirectResponse(f"http://localhost:5173/additional-info?email={user.email}")

    # ✅ JWT 발급 (login.py의 함수 사용)
    access_token = create_access_token(user.id, expires_delta=60)   # 60분짜리
    refresh_token = create_refresh_token(user.id, expires_days=7)  # 7일짜리

    # ✅ httpOnly 쿠키 심기
    response = RedirectResponse("http://localhost:5173/")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,     # 개발환경 False / 운영환경 True
        samesite="none",
        max_age=900,      # 15분
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="none",
        max_age=3600*24*7, # 7일
)
    return response