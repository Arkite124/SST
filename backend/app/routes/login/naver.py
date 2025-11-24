from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
import os
from jose import jwt
from datetime import datetime, timedelta
from app.routes.login.login import create_access_token, create_refresh_token
from models import Users as User
from data.postgresDB import SessionLocal
from dotenv import load_dotenv
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "tempsecret")  # 필요하면 .env 에 추가
router = APIRouter(prefix="/auth/naver", tags=["naver"])
oauth = OAuth()

oauth.register(
    name="naver",
    client_id=os.getenv("NAVER_CLIENT_ID"),
    client_secret=os.getenv("NAVER_CLIENT_SECRET"),
    authorize_url="https://nid.naver.com/oauth2.0/authorize",
    access_token_url="https://nid.naver.com/oauth2.0/token",
    api_base_url="https://openapi.naver.com/v1/nid/",
    client_kwargs={"scope": "name email"},
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 네이버 로그인 요청
@router.get("/login")
async def naver_login(request: Request):
    """
    네이버 로그인 요청을 보내는 엔드포인트 입니다.
    """
    redirect_uri = request.url_for("naver_callback")
    return await oauth.naver.authorize_redirect(request, redirect_uri)

# 네이버 콜백 처리
@router.get("/callback")
async def naver_callback(request: Request, db: Session = Depends(get_db)):
    """
    네이버 콜백 요청을 보내는 엔드포인트 입니다.
    """
    try:
        token = await oauth.naver.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    try:
        resp = await oauth.naver.get("me", token=token)
        user_info = resp.json().get("response")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Userinfo request failed: {str(e)}")

    if not user_info:
        raise HTTPException(status_code=400, detail="네이버 인증이 실패했습니다.")

    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="네이버 이메일 등록여부를 확인해주세요.")

    # ✅ DB 조회/생성
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=user_info.get("name"), oauth="naver")
        db.add(user)
        db.commit()
        db.refresh(user)

        # 임시 토큰 발급 (10분 유효)
        temp_token = jwt.encode(
            {
                "user_id": user.id,
                "type": "social_signup",
                "exp": datetime.utcnow() + timedelta(minutes=10)
            },
            SECRET_KEY,
            algorithm="HS256"
        )

        return RedirectResponse(f"http://localhost:5173/social?token={temp_token}")
    # ✅ JWT 발급
    access_token = create_access_token(user.id, expires_minutes=60)
    refresh_token = create_refresh_token(user.id, expires_days=7)
    response = RedirectResponse("http://localhost:5173/")
    # response = RedirectResponse("/")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,    # 개발환경 False / 배포 True
        samesite="lax", # 크로스 도메인 허용
        max_age=3600,     # 15분
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600*24*7,  # 7일
    )
    return response
