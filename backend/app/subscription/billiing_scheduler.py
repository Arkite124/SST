from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session

from app.subscription.subscripe_service import SubscriptionService
from data.postgresDB import SessionLocal


def run_billing_jobs():
    print(f"[{datetime.now()}] 🔔 정기결제 스케줄러 실행 시작")
    db: Session = SessionLocal()
    service = SubscriptionService(db=db)

    due_subs = service.get_due_subscriptions()
    print(f"📋 결제 대상 구독 수: {len(due_subs)}")

    for sub in due_subs:
        print(f"💳 결제 시도 중: 구독 ID={sub.id}, 유저 ID={sub.user_id}")
        try:
            service.approve_billing(sub.id)
        except Exception as e:
            print(f"결제 실패 (구독 ID={sub.id}): {e}")
    db.close()
    print(f"[{datetime.now()}] ✅ 스케줄러 작업 종료\n")


def start_scheduler():
    scheduler = BackgroundScheduler(timezone="Asia/Seoul")

    # 매일 새벽 3시 실행
    scheduler.add_job(run_billing_jobs, "cron", hour=3, minute=0)

    scheduler.start()
    print("✅ APScheduler started (매일 03:00 자동결제)")
