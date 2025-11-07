# 이미지파일 올린것 처럼 내용이 들어갈 예정
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from sqlalchemy import text
from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Users, UserGames, DailyWritings, ReadingLogs, UserTests
import os

router = APIRouter(prefix="/parent/dashboard", tags=["parent-dashboard"])

# ✅ 환경변수 (실서비스에서는 .env에 넣기)
SECRET_KEY = os.getenv("PARENT_SECRET_KEY", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1시간

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT 발급 함수
def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    expire = datetime.now() + timedelta(minutes=expires_delta)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class ParentKeyInput(BaseModel):
    parent_key: str

# JWT 검증 함수
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

class ParentLoginSchema(BaseModel):
    parent_key: str
# ✅ 부모 로그인
# ✅ 부모 로그인 (자녀 계정 로그인 상태 필요)

@router.post("/login")
def parent_login(
    payload: ParentLoginSchema,
    current_user: Users = Depends(get_current_user),   # ✅ 여기서 주입받음
    db: Session = Depends(get_db),
    response: Response = None
):
    parent_key = payload.parent_key
    user_id = current_user.id   # Users 객체에서 id 꺼내기

    if not current_user:
        raise HTTPException(status_code=401, detail="로그인 여부를 확인해주세요.")
    if not current_user.key_parent or not pwd_context.verify(parent_key, current_user.key_parent):
        raise HTTPException(status_code=403, detail="Invalid parent key")

    token = create_access_token({"sub": str(user_id), "parent": True})

    response.set_cookie(
        key="parent_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600
    )
    return {
        "parent_token": token,
        "token_type": "bearer",
        "user_id": user_id
    }
# ───────────────────────────────
# ✅ parent_token 검증
# ───────────────────────────────
def get_current_parent_token(parent_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not parent_token:
        raise HTTPException(status_code=401, detail="parent_token이 없습니다.")
    try:
        payload = jwt.decode(parent_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        if not payload.get("parent"):
            raise HTTPException(status_code=403, detail="부모 인증이 아닙니다.")
        user = db.query(Users).filter(Users.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="만료되었거나 잘못된 parent_token입니다.")


# ───────────────────────────────
# 1️⃣ 일일 활동량 차트 (글쓰기 / 독서 / 테스트 / 게임)
# ───────────────────────────────
@router.get("/activity/chart")
def get_child_activity_chart(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_parent_token)
):
    """
    📊 최근 1개월간 자녀의 일별 활동량 추이
    """
    def format_data(queryset):
        return [{"date": q.date.strftime("%Y-%m-%d"), "count": q.count} for q in queryset]

    writings = db.query(
        func.date_trunc("day", DailyWritings.created_at).label("date"),
        func.count(DailyWritings.id).label("count")
    ).filter(
        DailyWritings.user_id == current_user.id,
        DailyWritings.created_at >= func.now() - text("interval '1 month'")
    ).group_by("date").order_by("date").all()

    readings = db.query(
        func.date_trunc("day", ReadingLogs.created_at).label("date"),
        func.count(ReadingLogs.id).label("count")
    ).filter(
        ReadingLogs.user_id == current_user.id,
        ReadingLogs.created_at >= func.now() - text("interval '1 month'")
    ).group_by("date").order_by("date").all()

    tests = db.query(
        func.date_trunc("day", UserTests.taken_at).label("date"),
        func.count(UserTests.id).label("count")
    ).filter(
        UserTests.user_id == current_user.id,
        UserTests.taken_at >= func.now() - text("interval '1 month'")
    ).group_by("date").order_by("date").all()

    games = db.query(
        func.date_trunc("day", UserGames.played_at).label("date"),
        func.count(UserGames.id).label("count")
    ).filter(
        UserGames.user_id == current_user.id,
        UserGames.played_at >= func.now() - text("interval '1 month'")
    ).group_by("date").order_by("date").all()

    return {
        "daily_writings": format_data(writings),
        "reading_logs": format_data(readings),
        "tests": format_data(tests),
        "games": format_data(games),
    }


# ───────────────────────────────
# 2️⃣ 테스트 점수 차트
# ───────────────────────────────
@router.get("/tests/chart")
def get_child_test_chart(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_parent_token)
):
    """
    📊 최근 1개월간 테스트 유형별 평균 점수
    """
    test_data = db.query(
        UserTests.test_type,
        func.avg(UserTests.total_score).label("avg_score")
    ).filter(
        UserTests.user_id == current_user.id,
        UserTests.taken_at >= func.now() - text("interval '1 month'")
    ).group_by(UserTests.test_type).all()

    return [{"test_type": t[0], "avg_score": round(t[1], 2)} for t in test_data]


# ───────────────────────────────
# 3️⃣ 게임 점수 차트
# ───────────────────────────────
@router.get("/games/chart")
def get_child_game_chart(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_parent_token)
):
    """
    📊 최근 1개월간 게임 유형별 평균 점수
    """
    game_data = db.query(
        UserGames.game_type,
        func.avg(UserGames.score).label("avg_score"),
        func.count(UserGames.id).label("play_count")
    ).filter(
        UserGames.user_id == current_user.id,
        UserGames.played_at >= func.now() - text("interval '1 month'")
    ).group_by(UserGames.game_type).all()

    return [{"game_type": g[0], "avg_score": round(g[1], 2), "count": g[2]} for g in game_data]


# ───────────────────────────────
# 4️⃣ 기분 변화 차트 (일기 mood)
# ───────────────────────────────
@router.get("/mood/chart")
def get_child_mood_chart(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_parent_token)
):
    """
    📊 최근 1개월간 일일 평균 기분 점수
    """
    mood_data = db.query(
        func.date_trunc("day", DailyWritings.created_at).label("date"),
        func.avg(DailyWritings.mood).label("avg_mood")
    ).filter(
        DailyWritings.user_id == current_user.id,
        DailyWritings.created_at >= func.now() - text("interval '1 month'")
    ).group_by("date").order_by("date").all()

    return [{"date": d.date.strftime("%Y-%m-%d"), "avg_mood": round(d.avg_mood or 0, 2)} for d in mood_data]