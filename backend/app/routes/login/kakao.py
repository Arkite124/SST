from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
import os
from models import Users as User
from data.postgresDB import SessionLocal
from dotenv import load_dotenv
from app.routes.login import create_access_token, create_refresh_token

load_dotenv()
router = APIRouter(prefix="/auth/kakao", tags=["kakao"])
oauth = OAuth()

oauth.register(
    name="kakao",
    client_id=os.getenv("KAKAO_CLIENT_ID"),   # REST API 키
    authorize_url="https://kauth.kakao.com/oauth/authorize",
    access_token_url="https://kauth.kakao.com/oauth/token",
    api_base_url="https://kapi.kakao.com/v2/",
    # scope 빼고 기본만 요청
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 카카오 로그인 요청
@router.get("/login")
async def kakao_login(request: Request):
    """
    카카오로 로그인 요청을 보내는 엔드포인트 입니다.
    """
    redirect_uri = request.url_for("kakao_callback")
    return await oauth.kakao.authorize_redirect(request, redirect_uri)

# 카카오 콜백 처리
@router.get("/callback", name="kakao_callback")
async def kakao_callback(request: Request, db: Session = Depends(get_db)):
    """
    카카오에서 콜백을 받는 엔드포인트 입니다.
    """
    try:
        token = await oauth.kakao.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    # ✅ 사용자 정보 요청
    try:
        resp = await oauth.kakao.get("user/me", token=token)
        user_info = resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Userinfo request failed: {str(e)}")

    if not user_info or "id" not in user_info:
        raise HTTPException(status_code=400, detail="Kakao authentication failed")

    kakao_id = user_info.get("id")

    # ✅ 카카오는 이메일이 없을 수 있으므로 id 기반으로만 회원 관리
    user = db.query(User).filter(
        User.oauth == "kakao", User.name == f"kakao_{kakao_id}"
    ).first()

    if not user:
        # 신규 회원 → 임시 email/닉네임 부여
        user = User(
            email=f"{kakao_id}@kakao.local",   # 임시 이메일
            name=f"kakao_{kakao_id}",          # 임시 닉네임
            oauth="kakao"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return RedirectResponse(f"http://localhost:5173/additional-info?email={user.email}")

    # ✅ JWT 발급 (우리 서비스용)
    access_token = create_access_token(user.id, expires_minutes=15)
    refresh_token = create_refresh_token(user.id, expires_days=7)

    # ✅ JWT를 httpOnly 쿠키로 클라이언트에 심기
    response = RedirectResponse("http://localhost:5173/")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,     # 운영환경에서는 True
        samesite="none",  # CORS 허용
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

