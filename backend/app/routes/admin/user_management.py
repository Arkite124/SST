from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.routes.admin.admin_dashboard import get_db, get_current_admin
from models import UserBans as UserBan, Users


# ---------------------------------------------------------
# Base Schemas
# ---------------------------------------------------------
class UserBanBase(BaseModel):
    user_id: int
    reason: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class UserBanCreate(UserBanBase):
    is_auto: bool = False
    banned_by: Optional[int] = None  # 관리자 ID


class UserBanRead(UserBanBase):
    id: int
    banned_by: Optional[int]
    is_auto: bool
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# 📌 DB Functions
# ---------------------------------------------------------
def create_ban_record(db: Session, ban: UserBanCreate):
    """DB에 벤 기록 생성"""
    db_ban = UserBan(**ban.dict())
    db.add(db_ban)
    db.commit()
    db.refresh(db_ban)
    return db_ban


def list_bans_with_user(db: Session, page: int = 1, size: int = 10):
    """관리자용 전체 벤 + 유저 닉네임 조회"""
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


def get_bans_by_user(db: Session, user_id: int):
    return db.query(UserBan).filter(UserBan.user_id == user_id).all()


def lift_ban_record(db: Session, ban_id: int):
    """특정 벤 해제"""
    ban = db.query(UserBan).filter(UserBan.id == ban_id).first()
    if ban:
        ban.status = "lifted"
        db.commit()
        db.refresh(ban)
    return ban


# ---------------------------------------------------------
# 📌 Router 설정
# ---------------------------------------------------------
router = APIRouter(prefix="/admin/users", tags=["User Ban"])


# =========================================================
# 1) 📌 벤 생성 (관리자)
# =========================================================
@router.post(
    "/bans",
    response_model=UserBanRead,
    summary="사용자 벤 생성",
    description="""
관리자가 특정 사용자에게 **벤을 부여**하는 API입니다.

### 기능
- 사유(reason), 시작일(start_date), 종료일(end_date), 메모(notes) 입력 가능  
- 자동 벤(is_auto) 값도 포함 가능  
- banned_by 필드는 자동으로 관리자 ID로 설정

---

### 응답 예시
```json
{
  "id": 4,
  "user_id": 21,
  "reason": "욕설 및 비방",
  "status": "active",
  "banned_by": 1
}
"""
)
def create_ban(
ban: UserBanCreate,
db: Session = Depends(get_db),
current_admin=Depends(get_current_admin)
):
    ban.banned_by = current_admin.id
    return create_ban_record(db, ban)

#=========================================================
# Simple Schemas
#=========================================================

class SimpleUserBan(BaseModel):
    user_id: int
    nickname: str
    reason: str
    created_at: datetime
    end_date: Optional[datetime]

class PaginatedSimpleBans(BaseModel):
    items: List[SimpleUserBan]
    total: int
    page: int
    size: int
    pages: int

# #=========================================================
# 2) 📌 전체 벤 목록 조회
#=========================================================

@router.get(
"/bans",
response_model=PaginatedSimpleBans,
summary="전체 벤 목록 조회 (관리자)",
description="""
전체 벤 이력을 페이지네이션 형태로 조회합니다.
유저 닉네임이 함께 포함됩니다.

---

###응답 예시
```json
{
  "items": [
    {
      "user_id": 21,
      "nickname": "새싹이",
      "reason": "비속어 사용",
      "created_at": "2025-01-05T12:00:00",
      "end_date": null
    }
  ],
  "total": 23,
  "page": 1,
  "size": 10,
  "pages": 3
}
"""
)
def read_bans(
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    return list_bans_with_user(db, page=page, size=size)

#=========================================================
# 3) 📌 특정 유저의 벤 내역 조회
#=========================================================
@router.get(
"/bans/user/{user_id}",
response_model=List[UserBanRead],
summary="특정 유저의 벤 내역 조회",
description="""
해당 사용자의 전체 벤 이력을 조회합니다.

특징
종료된 벤 / 해제된 벤 포함 전체 출력

"""
)
def read_user_bans(
user_id: int,
db: Session = Depends(get_db),
current_admin=Depends(get_current_admin)
):
    return get_bans_by_user(db, user_id)

#=========================================================
# 4) 📌 단일 벤 상세 조회
#=========================================================
@router.get(
"/bans/detail/{ban_id}",
response_model=UserBanRead,
summary="단일 벤 상세 조회",
description="""
특정 벤 기록 1건을 상세 조회합니다.

예외
존재하지 않는 ban_id → 404
"""
)
def read_ban(
ban_id: int,
db: Session = Depends(get_db),
current_admin=Depends(get_current_admin)
):
    ban = db.query(UserBan).filter(UserBan.id == ban_id).first()
    if not ban:
        raise HTTPException(status_code=404, detail="Ban not found")
    return ban

#=========================================================
# 5) 📌 벤 해제 (status=lifted)
#=========================================================

@router.patch(
"/bans/{ban_id}",
response_model=UserBanRead,
summary="벤 해제 (status → lifted)",
description="""
특정 벤의 상태(status)를 "lifted" 로 변경합니다.

예외
존재하지 않는 ban_id → 404
"""
)
def lift_ban(
ban_id: int,
db: Session = Depends(get_db),
current_admin=Depends(get_current_admin)
):
    ban = lift_ban_record(db, ban_id)
    if not ban:
        raise HTTPException(status_code=404, detail="해당 벤을 찾지 못했습니다.")
    return ban