from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from jose import jwt
from datetime import datetime, timedelta
import os
from models import Users as User
from data.postgresDB import SessionLocal
from dotenv import load_dotenv
from app.routes.login.login import create_access_token, create_refresh_token

load_dotenv()

router = APIRouter(prefix="/auth/kakao", tags=["kakao"])
oauth = OAuth()

SECRET_KEY=os.getenv("SECRET_KEY")  # 임시 토큰용 시크릿

oauth.register(
    name="kakao",
    client_id=os.getenv("KAKAO_CLIENT_ID"),
    authorize_url="https://kauth.kakao.com/oauth/authorize",
    access_token_url="https://kauth.kakao.com/oauth/token",
    api_base_url="https://kapi.kakao.com/v2/",
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/login")
async def kakao_login(request: Request):
    """
    카카오로 로그인 요청을 보내는 엔드포인트 입니다.
    """
    redirect_uri = request.url_for("kakao_callback")
    return await oauth.kakao.authorize_redirect(request, redirect_uri)


@router.get("/callback", name="kakao_callback")
async def kakao_callback(request: Request, db: Session = Depends(get_db)):
    """
    카카오로 로그인 콜백을 보내는 엔드포인트 입니다.
    """
    # 1) Access Token 발급
    try:
        token = await oauth.kakao.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(400, f"Token exchange failed: {str(e)}")

    # 2) 사용자 정보 조회
    try:
        resp = await oauth.kakao.get("user/me", token=token)
        user_info = resp.json()
    except Exception as e:
        raise HTTPException(400, f"Userinfo request failed: {str(e)}")

    if not user_info or "id" not in user_info:
        raise HTTPException(400, "Kakao authentication failed")

    kakao_id = user_info["id"]

    # 카카오는 이메일이 없을 수 있으므로 kakao_id 기반 관리
    user = db.query(User).filter(
        User.oauth == "kakao", User.name == f"kakao_{kakao_id}"
    ).first()

    # 3) 신규 회원 → 임시 토큰 발급 → 프론트 social 페이지 이동
    if not user:
        user = User(
            email=f"{kakao_id}@kakao.local",   # 임시 이메일
            name=f"kakao_{kakao_id}",
            oauth="kakao"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 📌 임시 소셜 토큰 생성 (10분 유효)
        temp_token = jwt.encode(
            {
                "user_id": user.id,
                "type": "social_signup",
                "exp": datetime.now() + timedelta(minutes=10)
            },
            SECRET_KEY,
            algorithm="HS256"
        )
        return RedirectResponse(f"http://localhost:5173/social?token={temp_token}")

    # 4) 기존 회원 → 바로 로그인
    access_token = create_access_token(user.id, expires_minutes=60)
    refresh_token = create_refresh_token(user.id, expires_days=7)

    response = RedirectResponse("http://localhost:5173/")
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax")

    return response
