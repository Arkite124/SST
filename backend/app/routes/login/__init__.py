from fastapi import APIRouter

from .login import router as login_router
from .google import router as google_router
from .naver import router as naver_router
from .kakao import router as kakao_router
from .register import router as register
auth_router = APIRouter()
# 추가정보 입력
# 밑에 4개는 각각 일반로그인, 구글, 네이버, 카카오 소셜 로그인
auth_router.include_router(login_router)
auth_router.include_router(google_router)
auth_router.include_router(naver_router)
auth_router.include_router(kakao_router)
# 회원가입
auth_router.include_router(register)