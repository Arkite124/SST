from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, HTTPException,Request,status
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse, JSONResponse

from app.routes.login.login import get_current_user, verify_password
from models import Users as User, Users
from data.postgresDB import SessionLocal
from typing import Optional
from pydantic import BaseModel

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
    name: Optional[str]
    nickname: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    phone: Optional[str] = None
    oauth: Optional[str] = None
    role: Optional[str] = None
    email: str
    key_parent: Optional[str]

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    password: Optional[str] = None
    nickname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    key_parent: Optional[str] = None

    class Config:
        from_attributes = True

# ---------------------------
# ✅ 내 정보 조회
# ---------------------------
@router.get("/me", response_model=UserRead)
def info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    내 정보를 조회하는 엔드포인트 입니다.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return current_user   # ORM 객체 그대로 반환 (Pydantic에서 처리)

# ---------------------------
# ✅ 내 정보 수정
# ---------------------------
@router.patch("/me", response_model=UserRead)
def patch_info(
    data: UserRead = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    유저 정보를 수정하는 엔드포인트 입니다.
    닉네임, 핸드폰 번호는 중복 확인 로직 넣어주셔야 합니다.
    name: Optional[str]
    nickname: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    phone: Optional[str] = None
    oauth: Optional[str] = None
    email: str
    key_parent: Optional[str]
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 다시 조회해서 현재 DB에 있는 User 객체 얻기
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return user

# ---------------------------
# ✅ 회원 탈퇴
# ---------------------------
@router.delete("/me", response_model=UserRead)
def delete_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    try:
        db.delete(current_user)
        db.commit()
    except Exception:
        raise HTTPException(status_code=500, detail="오류가 발생하였습니다.")

    print({"message": "회원 탈퇴 완료"})
    return RedirectResponse("http://localhost:5173/")
    # return RedirectResponse("http://localhost:5173/")
    # 서버 구동시에는 밑에껄 주석풀고 위에껄 주석해서 홈으로


class ConfirmPwSchema(BaseModel):
    password: str

def verify_pw_confirmed(request: Request):
    confirmed = request.session.get("pw_confirmed")
    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비밀번호 확인이 필요합니다."
        )
    return True
@router.get("/edit")
def get_profile_edit(
    request: Request,
    user=Depends(get_current_user),
    _=Depends(verify_pw_confirmed)
):
    return {
        "message": f"{user.nickname}님의 프로필 수정 페이지 접근 허용",
        "confirmed": True
    }

@router.post("/confirm-password")
def confirm_password(
    request: Request,
    payload: ConfirmPwSchema,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """로그인된 유저의 비밀번호를 검증 후 세션에 저장"""
    if not user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

    # ✅ 서버 세션에 확인 여부 저장
    request.session["pw_confirmed"] = True

    return {"confirmed": True, "message": "비밀번호 확인 완료"}
