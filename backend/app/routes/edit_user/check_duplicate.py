from dotenv import load_dotenv
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session

from app.routes.login.login import verify_password
from app.routes.login.register import hash_password
from models import Users as User
from data.postgresDB import SessionLocal
from typing import Optional, Any
from pydantic import BaseModel

load_dotenv()  # .env 파일 자동 로드
# 유저 정보
router = APIRouter(prefix="/check/duplicate",tags=["check_duplicate"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserRead(BaseModel):
    id: int
    nickname: str
    role: str
    email: str

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: str

    class Config:
        from_attributes = True

@router.post("/check-email")
async def check_duplicate_email(request: Request, db: Session = Depends(get_db)):
    """
    이메일 중복확인 엔드포인트
    """
    data = await request.json()
    email = data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="이메일이 제공되지 않았습니다.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"checkEmail": True, "message": "회원가입이 가능합니다."}
    if user.oauth is not None:
        return {"checkEmail": False, "message": "회원가입이 소셜로그인으로 되어 있습니다."}
    return {"checkEmail": False, "message": "이 이메일은 이미 존재합니다."}

@router.get("/{nickname}", response_model=Any)
def check_duplicate_nickname(nickname:str, db: Session = Depends(get_db)):
    """
    닉네임 중복확인 엔드포인트
    """
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        return {"checkNick":True,"nickMessage": "회원가입이 가능한 닉네임입니다."}
    return {"checkNick":False,"nickMessage": "이 닉네임은 이미 존재합니다. 다른 닉네임을 사용해주세요."}

@router.post("/check-phone")
async def check_duplicate_phone(request: Request, db: Session = Depends(get_db)):
    """
    핸드폰 번호 중복확인 엔드포인트
    """
    data = await request.json()
    phone = data.get("phone")

    if not phone:
        raise HTTPException(status_code=400, detail="전화번호가 제공되지 않았습니다.")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        return {"checkPhone": True, "phoneMessage": "사용 가능한 전화번호입니다."}
    return {"checkPhone": False, "phoneMessage": "이미 등록된 전화번호입니다."}

@router.post("/check-password", response_model=Any)
async def check_password(request: Request):
    """
    비밀번호 유효성 및 일치 여부 검사 엔드포인트
    - password / confirm_password 두 값을 비교
    - 길이(8~20자) 검증
    - 해시 및 검증 함수 사용
    """

    data = await request.json()
    password = data.get("password")
    confirm_password = data.get("confirmPassword")

    # ✅ 1. 입력값 검증
    if not password:
        return {"checkPw": False, "pwMessage": "비밀번호가 입력되지 않았습니다."}

    # ✅ 2. 길이 검증
    if len(password) < 8:
        return {"checkPw": False, "pwMessage": "비밀번호는 8자리 이상으로 입력해야 합니다."}
    if len(password) > 20:
        return {"checkPw": False, "pwMessage": "비밀번호는 20자리 이하로 입력해야 합니다."}

    # ✅ 3. 일치 여부 확인
    if password != confirm_password:
        return {"checkPw": False, "pwMessage": "입력된 비밀번호가 일치하지 않습니다."}

    # ✅ 4. 해시화 후 검증 (백엔드 저장용, 확인용)
    hashed_pw = hash_password(password)
    is_valid = verify_password(password, hashed_pw)

    if not is_valid:
        raise HTTPException(status_code=400, detail="비밀번호 해시 검증 실패")

    # ✅ 5. 성공 응답
    return {
        "checkPw": True,
        "pwMessage": "비밀번호 확인이 완료되었습니다.",
        "hashedPassword": hashed_pw
    }


# 부모 닉네임을 따로 사용할 시
# router.get("/{parent_nickname}/duplicate", response_model=UserRead)
# def check_duplicate_parent_nickname(parent_nickname:str, db: Session = Depends(get_db)):
#     user = db.query(User).filter(User.parent_nickname == parent_nickname).first()
#     if not user:
#         return {"message": "회원가입이 가능한 닉네임입니다."}
#     return {"message": "이 닉네임은 이미 존재합니다. 다른 닉네임을 사용해주세요."}