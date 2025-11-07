import httpx
from datetime import datetime, timedelta
from models import Subscriptions as Subscription

class SubscriptionService:
    def __init__(self, db):
        self.db = db

    def get_due_subscriptions(self):
        now = datetime.utcnow()
        return (
            self.db.query(Subscription)
            .filter(Subscription.active == True)
            .filter(Subscription.end_date <= now)
            .all()
        )

    def approve_billing(self, id: int):
        sub = self.db.query(Subscription).get(id)
        if not sub:
            raise Exception("구독을 찾을 수 없습니다.")

        # Toss 결제 API 호출
        url = f"https://api.tosspayments.com/v1/billing/{sub.billing_key}"
        headers = {
            "Authorization": "Basic <SECRET_KEY_BASE64>",
            "Content-Type": "application/json",
        }
        payload = {
            "amount": sub.amount,
            "customerKey": sub.customer.customer_key,
            "orderId": f"order-{id}-{int(datetime.now().timestamp())}",
            "orderName": f"{sub.cycle} 구독 결제",
        }

        with httpx.Client() as client:
            res = client.post(url, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            print(f"✅ 결제 성공: {data['paymentKey']}")

        # 다음 결제일 갱신 (예: 한 달 후)
        sub.next_payment_at = datetime.utcnow() + timedelta(days=30)
        self.db.commit()
