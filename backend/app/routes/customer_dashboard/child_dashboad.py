from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.routes.login.login import get_current_user
from models import (
    Users, DailyWritings, ReadingLogs,
    UserGames, UserTests, UserWordUsage
)
from app.routes.admin.admin_dashboard import get_db

router = APIRouter(prefix="/child/dashboard", tags=["Child Dashboard"])


# ───────────────────────────────
# 👦 유저 정보
# ───────────────────────────────
@router.get("/profile")
def get_child_profile(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    return {
        "nickname": current_user.nickname,
        "vocabulary_age": current_user.vocabulary_age,
        "exp": current_user.exp,
        "profile_img_url": current_user.profile_img_url,
    }


# ───────────────────────────────
# 📝 생활 글쓰기 (최근 1개월)
# ───────────────────────────────
@router.get("/writing")
def get_writing_stats(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    diary_count = db.query(DailyWritings).filter(
        DailyWritings.user_id == current_user.id,
        DailyWritings.created_at >= func.now() - text("interval '1 month'")
    ).count()

    avg_mood = db.query(func.avg(DailyWritings.mood)).filter(
        DailyWritings.user_id == current_user.id,
        DailyWritings.created_at >= func.now() - text("interval '1 month'")
    ).scalar()

    return {
        "diary_count": diary_count,
        "avg_mood": round(avg_mood or 0, 2)
    }


# ───────────────────────────────
# 📚 독서 활동 (최근 1개월)
# ───────────────────────────────
@router.get("/reading")
def get_reading_stats(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    reading_count = db.query(ReadingLogs).filter(
        ReadingLogs.user_id == current_user.id,
        ReadingLogs.created_at >= func.now() - text("interval '1 month'")
    ).count()

    return {"reading_count": reading_count}


# ───────────────────────────────
# 🧠 어휘 사용 분석 (최근 1개월)
# ───────────────────────────────
@router.get("/word-usage")
def get_word_usage(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    word_counts = (
        db.query(UserWordUsage.word, func.count(UserWordUsage.word))
        .filter(
            UserWordUsage.user_id == current_user.id,
            UserWordUsage.created_at >= func.now() - text("interval '1 month'")
        )
        .group_by(UserWordUsage.word)
        .order_by(func.count(UserWordUsage.word).desc())
        .limit(10)
        .all()
    )

    return {"top_words": [{"word": w[0], "count": w[1]} for w in word_counts]}


# ───────────────────────────────
# 🎮 게임 점수 (최근 1개월)
# ───────────────────────────────
@router.get("/games")
def get_game_stats(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    games = (
        db.query(UserGames.game_type, func.avg(UserGames.score))
        .filter(
            UserGames.user_id == current_user.id,
            UserGames.played_at >= func.now() - text("interval '1 month'")
        )
        .group_by(UserGames.game_type)
        .all()
    )
    return {"avg_scores": {g[0]: round(g[1], 2) for g in games}}


# ───────────────────────────────
# 🧾 테스트 결과 (최근 1개월)
# ───────────────────────────────
@router.get("/tests")
def get_test_results(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    tests = (
        db.query(UserTests.test_type, func.avg(UserTests.total_score))
        .filter(
            UserTests.user_id == current_user.id,
            UserTests.taken_at >= func.now() - text("interval '1 month'")
        )
        .group_by(UserTests.test_type)
        .all()
    )
    return {"avg_scores": {t[0]: round(t[1], 2) for t in tests}}