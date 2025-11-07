from fastapi import APIRouter,Depends,HTTPException,Response
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.routes.admin.admin_dashboard import get_db, get_current_admin
from models import UserBans as UserBan, Users


class UserBanBase(BaseModel):
    user_id: int
    reason: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None

class UserBanCreate(UserBanBase):
    is_auto: bool = False
    banned_by: Optional[int] = None   # 관리자일 경우

class UserBanRead(UserBanBase):
    id: int
    banned_by: Optional[int]
    is_auto: bool
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

def create_ban(db: Session, ban: UserBanCreate):
    db_ban = UserBan(**ban.dict())
    db.add(db_ban)
    db.commit()
    db.refresh(db_ban)
    return db_ban

def get_bans(db: Session, page: int = 1, size: int = 10):
    # 전체 개수
    total = db.query(UserBan).count()

    # 데이터 가져오기
    items = (
        db.query(UserBan)
        .offset((page - 1) * size)   # ✅ page는 1부터 시작한다고 가정
        .limit(size)
        .all()
    )

    # 전체 페이지 수 계산
    pages = (total + size - 1) // size   # 올림 처리

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def get_ban_by_user(db: Session, user_id: int, page: int = 0, size: int = 10):
    return db.query(UserBan).filter(UserBan.user_id == user_id).offset(page).limit(size).all()

def lift_ban(db: Session, ban_id: int):
    ban = db.query(UserBan).filter(UserBan.id == ban_id).first()
    if ban:
        ban.status = "lifted"
        db.commit()
        db.refresh(ban)
    return ban

router = APIRouter(prefix="/admin/users", tags=["User Ban"])

# ✅ 벤 생성 (관리자만 가능)
@router.post("/bans", response_model=UserBanRead)
def create_ban(
    ban: UserBanCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)   # 관리자 검증
):
    if not current_admin:
        raise HTTPException(status_code=404, detail="존재하지 않는 계정이거나 권한이 없습니다.")
    # banned_by 값 강제로 현재 관리자 ID로 세팅
    ban.banned_by = current_admin.id
    return create_ban(db, ban)

# -------------------------------
# 📘 Pydantic Schemas
# -------------------------------
class SimpleUserBan(BaseModel):
    user_id: int
    nickname: str
    reason: str
    created_at: datetime
    end_date: Optional[datetime] = None

    class Config:
        orm_mode = True


class PaginatedSimpleBans(BaseModel):
    items: List[SimpleUserBan]
    total: int
    page: int
    size: int
    pages: int


# -------------------------------
# 📘 DB Query Function
# -------------------------------
def get_bans_with_userinfo(db: Session, page: int = 1, size: int = 10):
    """UserBan과 Users 조인 → 필요한 필드만 반환"""
    total = db.query(UserBan).count()

    query = (
        db.query(
            UserBan.user_id,
            Users.nickname,
            UserBan.reason,
            UserBan.created_at,
            UserBan.end_date,
        )
        .join(Users, Users.id == UserBan.user_id)
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    pages = (total + size - 1) // size

    return {
        "items": [
            {
                "user_id": q.user_id,
                "nickname": q.nickname,
                "reason": q.reason,
                "created_at": q.created_at,
                "end_date": q.end_date,
            }
            for q in query
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# -------------------------------
# 📘 FastAPI Router
# -------------------------------
router = APIRouter(prefix="/admin/users", tags=["User Ban"])


@router.get("/bans", response_model=PaginatedSimpleBans)
def read_bans(
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """관리자용 전체 벤 목록 조회"""
    if not current_admin:
        raise HTTPException(status_code=404, detail="권한이 없습니다.")
    return get_bans_with_userinfo(db, page=page, size=size)

# ✅ 특정 유저의 벤 내역 조회 (관리자만 가능)
@router.get("/bans/{user_id}", response_model=List[UserBanRead])
def read_user_bans(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)   # 관리자 검증
):
    if not current_admin:
        raise HTTPException(status_code=404, detail="존재하지 않는 계정이거나 권한이 없습니다.")
    return get_ban_by_user(db, user_id)

# ✅ 단일 벤 상세 조회
@router.get("/bans/{ban_id}", response_model=UserBanRead)
def read_ban(
    ban_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    ban = db.query(UserBan).filter(UserBan.id == ban_id).first()
    if not current_admin:
        raise HTTPException(status_code=404, detail="존재하지 않는 계정이거나 권한이 없습니다.")
    if not ban:
        raise HTTPException(status_code=404, detail="Ban not found")
    return ban

# ✅ 벤 해제 (status 변경)
@router.patch("/bans/{ban_id}", response_model=UserBanRead)
def lift_ban(
    ban_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    ban = lift_ban(db, ban_id)
    if not current_admin:
        raise HTTPException(status_code=404, detail="존재하지 않는 계정이거나 권한이 없습니다.")
    if not ban:
        raise HTTPException(status_code=404, detail="Ban not found")
    return ban