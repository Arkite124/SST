# count -> 플랜별 구독자 수(total), 총 유저수, 월별 꺾은선 그래프 증가량
# 목표달성 달성치(신규 회원, 신규 구독), 월별 매출액, 흑자량, 고객센터 문의량, 미답변 글 수
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.routes.login.login import get_current_user
from models import Users, Subscriptions, DailyWritings, CustomerSupport, ReadingLogs, UserTests, UserGames, UserBans
from data.postgresDB import SessionLocal

router = APIRouter(prefix="/admin/dashboard", tags=["dashboard"])

# DB 세션
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_admin(current_user: Users = Depends(get_current_user)):
    if not current_user or current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="관리자 권한이 필요합니다."
        )
    return current_user
# ───────────────────────────────
# 👑 관리자 인증 기반
# ───────────────────────────────
# ───────────────────────────────
# 1️⃣ 유저 차트: 신규가입 / 밴 / 소셜로그인 분포
# ───────────────────────────────
@router.get("/users/chart")
def get_user_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    📊 최근 1개월간 유저 관련 추이 (신규 가입자 수, 밴 수)
    """
    new_users = (
        db.query(
            func.date_trunc("day", Users.created_at).label("date"),
            func.count(Users.id).label("count")
        )
        .filter(Users.created_at >= func.now() - text("interval '1 month'"))
        .group_by("date")
        .order_by("date")
        .all()
    )

    banned_users = (
        db.query(
            func.date_trunc("day", UserBans.start_date).label("date"),
            func.count(UserBans.id).label("count")
        )
        .filter(UserBans.start_date >= func.now() - text("interval '1 month'"))
        .group_by("date")
        .order_by("date")
        .all()
    )

    social_login_dist = (
        db.query(Users.oauth, func.count(Users.id))
        .filter(Users.oauth.isnot(None))
        .group_by(Users.oauth)
        .all()
    )

    return {
        "new_users": [{"date": d.date.strftime("%Y-%m-%d"), "count": d.count} for d in new_users],
        "banned_users": [{"date": d.date.strftime("%Y-%m-%d"), "count": d.count} for d in banned_users],
        "social_logins": [{"type": o[0], "count": o[1]} for o in social_login_dist],
    }


# ───────────────────────────────
# 2️⃣ 구독 차트: 플랜별 매출 / 신규 구독자 수
# ───────────────────────────────
@router.get("/subscriptions/chart")
def get_subscription_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    📊 최근 1개월간 플랜별 일별 매출 및 구독자 수
    """
    data = (
        db.query(
            func.date_trunc("day", Subscriptions.start_date).label("date"),
            Subscriptions.plan_name,
            func.count(Subscriptions.id).label("subs"),
            func.sum(Subscriptions.amount).label("revenue")
        )
        .filter(Subscriptions.start_date >= func.now() - text("interval '1 month'"))
        .group_by("date", Subscriptions.plan_name)
        .order_by("date")
        .all()
    )

    results = {}
    for d in data:
        date = d.date.strftime("%Y-%m-%d")
        if date not in results:
            results[date] = {}
        results[date][d.plan_name] = {"subs": d.subs, "revenue": d.revenue}

    # 📊 플랜별 총합 (PieChart용)
    plan_totals = (
        db.query(Subscriptions.plan_name, func.sum(Subscriptions.amount))
        .filter(Subscriptions.start_date >= func.now() - text("interval '1 month'"))
        .group_by(Subscriptions.plan_name)
        .all()
    )

    return {
        "daily": results,  # 일별 데이터
        "plan_totals": [{"plan": p[0], "revenue": p[1]} for p in plan_totals],  # 플랜별 총매출
    }


# ───────────────────────────────
# 3️⃣ 학습 활동 차트: 테스트 평균 / 게임 횟수
# ───────────────────────────────
@router.get("/learning/chart")
def get_learning_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    📊 최근 1개월간 테스트 점수 및 게임 횟수 추이
    """
    test_data = (
        db.query(
            func.date_trunc("day", UserTests.taken_at).label("date"),
            UserTests.test_type,
            func.avg(UserTests.total_score).label("avg_score"),
            func.count(UserTests.id).label("test_count"),
        )
        .filter(UserTests.taken_at >= func.now() - text("interval '1 month'"))
        .group_by("date", UserTests.test_type)
        .order_by("date")
        .all()
    )

    game_data = (
        db.query(
            func.date_trunc("day", UserGames.played_at).label("date"),
            UserGames.game_type,
            func.count(UserGames.id).label("count")
        )
        .filter(UserGames.played_at >= func.now() - text("interval '1 month'"))
        .group_by("date", UserGames.game_type)
        .order_by("date")
        .all()
    )

    tests_by_type = {}
    for d in test_data:
        date = d.date.strftime("%Y-%m-%d")
        if date not in tests_by_type:
            tests_by_type[date] = {}
        tests_by_type[date][d.test_type] = {"avg_score": round(d.avg_score or 0, 2), "count": d.test_count}

    games_by_type = {}
    for d in game_data:
        date = d.date.strftime("%Y-%m-%d")
        if date not in games_by_type:
            games_by_type[date] = {}
        games_by_type[date][d.game_type] = d.count

    return {
        "tests": tests_by_type,
        "games": games_by_type
    }


# ───────────────────────────────
# 4️⃣ 콘텐츠 차트: 일일 글/독서/기분 합계
# ───────────────────────────────
@router.get("/contents/chart")
def get_content_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    📊 최근 1개월간 일별 글쓰기, 독서록 수 및 기분 평균
    """
    writings = (
        db.query(
            func.date_trunc("day", DailyWritings.created_at).label("date"),
            func.count(DailyWritings.id).label("writing_count"),
            func.avg(DailyWritings.mood).label("avg_mood")
        )
        .filter(DailyWritings.created_at >= func.now() - text("interval '1 month'"))
        .group_by("date")
        .order_by("date")
        .all()
    )

    readings = (
        db.query(
            func.date_trunc("day", ReadingLogs.created_at).label("date"),
            func.count(ReadingLogs.id).label("reading_count")
        )
        .filter(ReadingLogs.created_at >= func.now() - text("interval '1 month'"))
        .group_by("date")
        .order_by("date")
        .all()
    )

    result = {}
    for d in writings:
        date = d.date.strftime("%Y-%m-%d")
        result[date] = {
            "writing_count": d.writing_count,
            "avg_mood": round(d.avg_mood or 0, 2)
        }
    for d in readings:
        date = d.date.strftime("%Y-%m-%d")
        if date not in result:
            result[date] = {}
        result[date]["reading_count"] = d.reading_count

    return result


# ───────────────────────────────
# 5️⃣ 고객센터 차트: 문의 카테고리/상태 분포
# ───────────────────────────────
@router.get("/support/chart")
def get_support_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    📊 최근 1개월간 고객센터 문의 상태 / 카테고리 분포
    """
    category_data = (
        db.query(CustomerSupport.category, func.count(CustomerSupport.id))
        .filter(CustomerSupport.created_at >= func.now() - text("interval '1 month'"))
        .group_by(CustomerSupport.category)
        .all()
    )

    status_data = (
        db.query(CustomerSupport.status, func.count(CustomerSupport.id))
        .filter(CustomerSupport.created_at >= func.now() - text("interval '1 month'"))
        .group_by(CustomerSupport.status)
        .all()
    )

    return {
        "by_category": [{"category": c[0], "count": c[1]} for c in category_data],
        "by_status": [{"status": s[0], "count": s[1]} for s in status_data],
    }
