from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, HTTPException,Request,status
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse, JSONResponse

from app.routes.login.login import get_current_user, verify_password
from models import Users as User, Users
from data.postgresDB import SessionLocal
from typing import Optional
from pydantic import BaseModel
from passlib.context import CryptContext

load_dotenv()  # .env 파일 자동 로드
# 유저 정보
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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
@router.get("/me",
    response_model=UserRead,
    summary="내 정보를 조회합니다.",
    description=
    """로그인한 사용자의 프로필 정보를 반환합니다.
    JWT 인증이 필요합니다.
    
    ---
    
    ### 응답 예시
    ```json
    {
      "id": 3,
      "name": "홍길동",
      "nickname": "길동이",
      "age": 12,
      "gender": "male",
      "phone": "010-1234-5678",
      "oauth": "google",
      "role": "customer",
      "email": "test@example.com",
      "key_parent": null
    }"""
)
def info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),

):
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return current_user   # ORM 객체 그대로 반환 (Pydantic에서 처리)

# ---------------------------
# ✅ 내 정보 수정
# ---------------------------
@router.patch("/me", response_model=UserRead,
      summary="내 프로필 정보를 수정합니다",
     description="""닉네임 / 전화번호는 중복 검증 후 수정 가능합니다.
key_parent 수정 시 bcrypt 해시로 암호화됩니다.
변경된 값만 부분 수정(PATCH) 방식으로 전송합니다.

### 요청 예시
```json
{
    "nickname": "새싹맘",
    "age": 13,
    "phone": "010-5555-7777",
    "key_parent": "my-parent-key"
}

```

### 응답 예시
```json
{
    "id": 3,
    "name": "홍길동",
    "nickname": "새싹맘",
    "age": 13,
    "gender": "female",
    "phone": "010-5555-7777",
    "oauth": "google",
    "role": "customer",
    "email": "test@example.com",
    "key_parent": "$2b$12$92qZ..."
}"""
)
def patch_info(
    data: UserRead = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # DB에서 유저 다시 조회
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():

        # 🔥 key_parent가 수정되었다면 → 암호화 후 저장
        if key == "key_parent" and value is not None and value != "":
            hashed_value = pwd_context.hash(value)
            setattr(user, key, hashed_value)
        else:
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
