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
@router.get(
    "/status",
    summary="현재 구독 상태 조회",
    description="""
현재 로그인한 사용자의 최신 구독 상태를 조회합니다.

### 주요 기능
- 가장 최근(end_date 기준) 구독 정보를 조회
- 구독 중이 아니면 `active: false` 반환
- 다음 결제 예정 플랜(next_plan_name)이 있을 경우 함께 반환

### 응답 예시
```json
{
  "id": 1,
  "active": true,
  "plan_name": "standard",
  "status": "paid",
  "end_date": "2025-02-10 12:00:00",
  "next_plan": {
    "plan_name": "premium",
    "amount": 15000
  }
}
"""
)
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

## 📌 2) 구독 내역 목록 조회
@router.get(
    "/history",
    response_model=List[SubscriptionResponse],
    summary="구독 내역 목록 조회",
    description="""
현재 사용자의 구독 결제 내역을 페이지네이션 형태로 조회합니다.

### 주요 기능
- 결제 완료/해지 포함 전체 구독 내역 조회
- 최신 결제(paid_at) 순으로 정렬
- 페이지(page), 크기(size) 파라미터 제공

### Query Parameters
- `page`: 페이지 번호
- `size`: 페이지 당 항목 수
"""
)
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
@router.get(
    "/history/{subscription_id}",
    response_model=SubscriptionResponse,
    summary="구독 상세 조회",
    description="""
특정 구독 ID에 대한 상세 정보를 조회합니다.

### 주요 기능
- 사용자 본인의 구독만 조회 가능
- 존재하지 않는 경우 404 반환
"""
)
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

@router.post(
    "/billing/confirm",
    summary="구독 등록(결제 승인 후 BillingKey 저장)",
    description="""
결제 승인 후 결제 정보를 DB에 저장하여 구독을 등록합니다.

### 주요 기능
- Toss Payments에서 billingKey, customerKey를 검증 후 저장
- 첫 구독 시작일(start_date), 종료일(end_date) 자동 설정 (30일 기준)
- 기본 상태(status)는 `authorized`

### Request Body 예시(authKey가 billingKey로 들어가게 해놓음)
```json
{
  "billingKey": "billing_xxxx",
  "customerKey": "user_1",
  "plan_name": "standard",
  "amount": 10000
}
"""
)
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
@router.post(
    "/billing/pay/{subscription_id}",
    response_model=SubscriptionResponse,
    summary="정기결제 실행",
    description="""
등록된 BillingKey를 사용하여 정기결제를 실행합니다.

### 주요 기능
- Toss Payments Billing API 요청
- 다음 결제 예정 플랜(next_plan_name)이 있다면 해당 플랜으로 결제
- 결제 성공 시:
  - 상태(status='paid')
  - 다음 30일(end_date) 갱신
  - 예약된 next_plan_* 초기화

### 실패 시
- Toss API의 응답을 그대로 반환
"""
)
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
@router.post(
    "/billing/change-plan/{subscription_id}",
    summary="구독 플랜 변경 예약",
    description="""
구독자의 다음 결제부터 새로운 플랜을 적용하도록 예약합니다.

### 주요 기능
- 현재 구독 중일 때만 변경 가능
- 즉시 반영되는 것이 아니라 다음 Billing 결제 시 적용됨
- 변경될 플랜(next_plan_name)과 금액(next_amount) 저장
"""
)
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
@router.post(
    "/billing/cancel/{subscription_id}",
    summary="구독 해지",
    description="""
현재 구독을 해지합니다.

### 주요 기능
- 사용자 본인의 구독인지 확인
- 상태(status)를 `canceled` 로 변경
- 즉시 결제 종료되며, 다음 달 결제는 진행되지 않음

---

###응답 예시
```json
{
    "message":"구독이 해지되었습니다"
}
"""
)
def cancel_billing(
    subscription_id: int,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)
):
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
