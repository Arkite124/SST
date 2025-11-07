import base64
import uuid
from datetime import datetime, timedelta
import os
from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from dotenv import load_dotenv

from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Subscriptions, Users

load_dotenv()

router = APIRouter(prefix="/subscription", tags=["subscription"])

TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================
# ✅ Schemas
# ===========================
class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_name: str
    amount: int
    status: str
    start_date: datetime=datetime.now()
    end_date: datetime
    paid_at: datetime=datetime.now()
    next_plan_name: str | None = None
    next_amount: int | None = None

    class Config:
        from_attributes = True

class BillingConfirmRequest(BaseModel):
    billingKey: str
    customerKey: str
    plan_name: str
    amount: int
# ===========================
# ✅ 현재 구독 상태
# ===========================
@router.get("/status")
def subscription_status(
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    latest = (
        db.query(Subscriptions)
        .filter(Subscriptions.user_id == user.id)
        .order_by(desc(Subscriptions.end_date))
        .first()
    )

    if not latest or latest.status == "canceled":
        return {"active": False, "message": "구독정보가 없습니다."}

    response = {
        "id": latest.id,
        "active": True,
        "plan_name": latest.plan_name,
        "status": latest.status,
        "end_date": latest.end_date.strftime("%Y-%m-%d %H:%M:%S"),
    }

    if latest.next_plan_name:
        response["next_plan"] = {
            "plan_name": latest.next_plan_name,
            "amount": latest.next_amount,
        }

    return response


# ===========================
# ✅ 구독 내역 목록
# ===========================
@router.get("/history", response_model=List[SubscriptionResponse])
def subscription_history(
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
):
    offset = (page - 1) * size
    history = (
        db.query(Subscriptions)
        .filter(Subscriptions.user_id == user.id)
        .order_by(desc(Subscriptions.paid_at))
        .offset(offset)
        .limit(size)
        .all()
    )
    return history


# ===========================
# ✅ 구독 상세
# ===========================
@router.get("/history/{subscription_id}", response_model=SubscriptionResponse)
def subscription_detail(
    subscription_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscriptions)
        .filter(Subscriptions.user_id == user.id, Subscriptions.id == subscription_id)
        .first()
    )
    if not sub:
        raise HTTPException(404, "구독을 찾을 수 없습니다.")
    return sub

@router.post("/billing/confirm")
def billing_confirm(
    data: BillingConfirmRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)
):
    if not user:
        raise HTTPException(401, "로그인이 필요합니다.")

    subscription = Subscriptions(
        user_id=user.id,
        plan_name=data.plan_name,
        amount=data.amount,
        billing_key=data.billingKey,
        status="authorized",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30),
        paid_at=datetime.now()
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return {"message": "구독 등록 완료", "subscription": subscription}

# ===========================
# ✅ 정기결제 실행
# ===========================
@router.post("/billing/pay/{subscription_id}", response_model=SubscriptionResponse)
async def billing_pay(subscription_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscriptions).filter(Subscriptions.id == subscription_id).first()
    if not sub:
        raise HTTPException(404, "구독을 찾을 수 없습니다.")

    encoded_secret = base64.b64encode(f"{TOSS_SECRET_KEY}:".encode("utf-8")).decode(
        "utf-8"
    )
    headers = {"Authorization": f"Basic {encoded_secret}", "Content-Type": "application/json"}

    # ✅ 예약 플랜이 있으면 우선 적용
    amount = sub.next_amount if sub.next_amount else sub.amount
    plan_name = sub.next_plan_name if sub.next_plan_name else sub.plan_name

    body = {
        "amount": amount,
        "orderId": f"order_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "orderName": f"{plan_name} 구독 결제",
        "customerKey": f"user_{sub.user_id}",
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.tosspayments.com/v1/billing/{sub.billing_key}",
            headers=headers,
            json=body,
        )

    if res.status_code != 200:
        raise HTTPException(res.status_code, res.json())

    # DB 갱신
    sub.status = "paid"
    sub.plan_name = plan_name
    sub.amount = amount
    sub.start_date = datetime.now()
    sub.end_date = datetime.now() + timedelta(days=30)
    sub.paid_at = datetime.now()
    sub.next_plan_name = None
    sub.next_amount = None

    db.commit()
    db.refresh(sub)

    return sub


# ===========================
# ✅ 플랜 변경 (다음 결제부터 적용)
# ===========================
@router.post("/billing/change-plan/{subscription_id}")
def change_plan(
    subscription_id: int,
    new_plan: str,
    new_amount: int,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    sub = (
        db.query(Subscriptions)
        .filter(Subscriptions.user_id == user.id, Subscriptions.id == subscription_id)
        .first()
    )
    if not sub:
        raise HTTPException(404, "구독을 찾을 수 없습니다.")

    sub.next_plan_name = new_plan
    sub.next_amount = new_amount
    db.commit()
    db.refresh(sub)

    return {"message": "플랜 변경이 예약되었습니다.", "subscription": sub}


# ===========================
# ✅ 구독 해지
# ===========================
@router.post("/billing/cancel/{subscription_id}")
def cancel_billing(subscription_id: int, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    sub = (
        db.query(Subscriptions)
        .filter(Subscriptions.user_id == user.id, Subscriptions.id == subscription_id)
        .first()
    )
    if not sub:
        raise HTTPException(404, "구독을 찾을 수 없습니다.")

    sub.status = "canceled"
    db.commit()

    return {"message": "구독이 해지되었습니다."}
