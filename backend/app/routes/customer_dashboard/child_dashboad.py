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
@router.get(
    "/profile",
    summary="자녀 프로필 정보 조회",
    description="""
로그인한 자녀의 기본 프로필 정보를 조회합니다.

### 포함 정보
- nickname: 닉네임
- vocabulary_age: 어휘연령
- exp: 경험치
- profile_img_url: 프로필 이미지 URL

### Response Example
```json
{
  "nickname": "새싹이",
  "vocabulary_age": 7,
  "exp": 1200,
  "profile_img_url": "https://cdn..." 
}
"""
)
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
@router.get(
    "/writing",
    summary="최근 1개월 글쓰기 활동 통계",
    description="""
최근 1개월 동안 자녀의 **생활 글쓰기(DailyWriting)** 데이터를 집계합니다.

### 제공 데이터
- diary_count: 작성한 글 개수
- avg_mood: 평균 기분 점수

### Response Example
```json
{
  "diary_count": 12,
  "avg_mood": 3.42
}
"""
)
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
# 독서 활동 (최근 1개월)
# ───────────────────────────────
@router.get(
    "/reading",
    summary="최근 1개월 독서 활동 통계",
    description="""
최근 1개월 동안 자녀가 기록한 **독서 횟수(ReadingLogs)** 를 집계합니다.

### Response Example
```json
{
  "reading_count": 8
}
"""
)
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
# 어휘 사용 분석 (최근 1개월)
# ───────────────────────────────
@router.get(
    "/word-usage",
    summary="최근 1개월 어휘 사용량 분석 (TOP 10)",
    description="""
최근 1개월 동안 자녀가 사용한 단어 목록 중  
**가장 많이 사용한 단어 10개**를 집계합니다.

### Response Example
```json
{
  "top_words": [
    {"word": "사과", "count": 5},
    {"word": "학교", "count": 4},
    {"word": "친구", "count": 4}
  ]
}
"""
)
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
# 게임 점수 (최근 1개월)
# ───────────────────────────────
@router.get(
    "/games",
    summary="최근 1개월 게임 평균 점수",
    description="""
최근 1개월 동안 자녀가 플레이한 게임들의  
**게임 유형별 평균 점수**를 조회합니다.

### Response Example
```json
{
  "avg_scores": {
    "word_chain": 78.5,
    "word_spell": 83.0
  }
}
"""
)
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
# 테스트 결과 (최근 1개월)
# ───────────────────────────────
@router.get(
    "/tests",
    summary="최근 1개월 테스트 평균 점수",
    description="""
최근 1개월 동안 자녀가 응시한  
**테스트 유형별 평균 점수**를 조회합니다.

### 테스트 예시 유형
- vocabulary
- reading
- sentence

### Response Example
```json
{
  "avg_scores": {
    "vocabulary": 92.5,
    "reading": 88.3
  }
}
"""
)
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