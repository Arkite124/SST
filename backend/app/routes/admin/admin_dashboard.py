# count -> 플랜별 구독자 수(total), 총 유저수, 월별 꺾은선 그래프 증가량
# 목표달성 달성치(신규 회원, 신규 구독), 월별 매출액, 흑자량, 고객센터 문의량, 미답변 글 수
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.routes.login.login import get_current_user
from models import Users, Subscriptions, DailyWritings, ReadingLogs, UserTests, UserGames, UserBans, \
    CustomerSupportPosts
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
# 관리자 인증 기반
# ───────────────────────────────
# ───────────────────────────────
# 1️⃣ 유저 차트: 신규가입 / 밴 / 소셜로그인 분포
# ───────────────────────────────
@router.get(
    "/users/chart",
    summary="유저 차트 — 신규가입 / 밴 / 소셜로그인 통계",
    description="""
최근 1개월 동안의 사용자 관련 통계 데이터를 제공합니다.

### 제공 데이터
- **new_users**: 일별 신규 가입자 수
- **banned_users**: 일별 밴된 사용자 수
- **social_logins**: 소셜 로그인(oauth) 분포

### 응답 예시
```json
{
  "new_users": [
    { "date": "2025-01-01", "count": 3 }
  ],
  "banned_users": [
    { "date": "2025-01-02", "count": 1 }
  ],
  "social_logins": [
    { "type": "google", "count": 12 }
  ]
}
"""
)
def get_user_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    최근 1개월간 유저 관련 추이 (신규 가입자 수, 밴 수)
    """
    if not current_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
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
@router.get(
    "/subscriptions/chart",
    summary="구독 차트 — 플랜별 매출 및 구독자 추이",
    description="""
최근 1개월 동안의 **구독 정보**를 분석합니다.

### 제공 데이터
- 일별 플랜별 신규 구독자 수
- 일별 플랜별 매출액
- Pie Chart용 플랜별 총 매출

### Response Example
```json
{
  "daily": {
    "2025-01-01": {
      "BASIC": { "subs": 3, "revenue": 15000 },
      "PRO": { "subs": 1, "revenue": 10000 }
    }
  },
  "plan_totals": [
    { "plan": "BASIC", "revenue": 123000 },
    { "plan": "PRO", "revenue": 52000 }
  ]
}
"""
)
def get_subscription_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    최근 1개월간 플랜별 일별 매출 및 구독자 수
    """
    if not current_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
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
@router.get(
    "/learning/chart",
    summary="학습 활동 차트 — 테스트 점수 및 게임 횟수",
    description="""
최근 1개월 동안의 학습 활동 데이터를 제공합니다.

### 제공 데이터
#### tests
- test_type별 일별 평균 점수
- test_type별 일별 응시 횟수

#### games
- game_type별 일별 플레이 횟수

### Response Example
```json
{
  "tests": {
    "2025-01-01": {
      "vocabulary": { "avg_score": 83.5, "count": 12 }
    }
  },
  "games": {
    "2025-01-01": { "word_chain": 8 }
  }
}
"""
)
def get_learning_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    최근 1개월간 테스트 점수 및 게임 횟수 추이
    """
    if not current_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
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
@router.get(
    "/contents/chart",
    summary="콘텐츠 차트 — 글쓰기/독서/기분(1개월)",
    description="""
최근 1개월 동안의 콘텐츠 활동 데이터를 제공합니다.

### 제공 데이터
- **writing_count**: 일별 글쓰기 작성 수  
- **avg_mood**: 일별 평균 mood  
- **reading_count**: 일별 독서 기록 수  

### Response Example
```json
{
  "2025-01-01": {
    "writing_count": 4,
    "avg_mood": 3.25,
    "reading_count": 2
  }
}
"""
)
def get_content_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    """
    최근 1개월간 일별 글쓰기, 독서록 수 및 기분 평균
    """
    if not current_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
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
# 고객센터 차트: 문의 카테고리/상태 분포
# ───────────────────────────────
@router.get(
    "/support/chart",
    summary="고객센터 차트 — 문의 카테고리/상태 분포",
    description="""
최근 1개월간 고객센터 문의 데이터를 분석합니다.

### 제공 데이터
- **by_category**: category별 문의 수     
    "payment_error",    # 결제 오류
    "report_user",      # 유저 신고
    "service_question", # 서비스 문제
    "bug_report",       # 버그 제보
    "etc",              #기타 문의
- **by_status**: status별 문의 수  
  - 예: open, answered, pending  

### Response Example
```json
{
  "by_category": [
    { "category": "system", "count": 5 }
  ],
  "by_status": [
    { "status": "open", "count": 3 }
  ]
}
"""
)
def get_support_chart(
    db: Session = Depends(get_db),
    current_admin: Users = Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    #  category 집계
    category_data = (
        db.query(CustomerSupportPosts.category, func.count(CustomerSupportPosts.id))
        .filter(CustomerSupportPosts.created_at >= func.now() - text("interval '1 month'"))
        .group_by(CustomerSupportPosts.category)
        .all()
    )

    #  status 집계: 기존 ENUM 그대로 유지!!
    status_data = (
        db.query(CustomerSupportPosts.status, func.count(CustomerSupportPosts.id))
        .filter(CustomerSupportPosts.created_at >= func.now() - text("interval '1 month'"))
        .filter(CustomerSupportPosts.status.in_(['open','in_progress','resolved','closed']))
        .group_by(CustomerSupportPosts.status)
        .all()
    )

    return {
        "by_category": [{"category": c[0], "count": c[1]} for c in category_data],
        "by_status": [{"status": s[0], "count": s[1]} for s in status_data],
    }