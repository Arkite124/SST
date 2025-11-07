import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/axiosInstance.js";

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const billingKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const planName = searchParams.get("plan_name");
    const amount = Number(searchParams.get("amount"));

    useEffect(() => {
        const confirmBilling = async () => {
            try {
                await axiosInstance.post(
                    "/subscription/billing/confirm",   // ✅ 올바른 엔드포인트
                    { billingKey, customerKey, plan_name: planName, amount },
                    { withCredentials: true }
                );
                toast.success("구독이 등록되었습니다 💳 약 3초 뒤 구독 페이지로 이동합니다.");
                setTimeout(() => {
                    navigate("/mypage/subscription");
                }, 3000);
            } catch (err) {
                console.error("❌ 구독 등록 실패:", err);
                navigate("/mypage/subscription/fail");
            }
        };

        if (billingKey && customerKey) {
            confirmBilling();
        }
    }, [billingKey, customerKey, planName, amount, navigate]);

    return (
        <div>
            <h1>구독 등록 처리중입니다...</h1>
            <p>잠시만 기다려주세요 🙏</p>
        </div>
    );
}

export default PaymentSuccess;
