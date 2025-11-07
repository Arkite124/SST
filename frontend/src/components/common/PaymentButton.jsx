import React from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import PlanCard from "@/components/subscription/PlanCard.jsx";


export const requestPayment = async (orderId, amount) => {
    const res = await axiosInstance.post(
        "/subscription/payments/request",
        { orderId, amount },           // ✅ 백엔드 PaymentRequest 스키마에 맞게 body 전송
        { withCredentials: true }      // 쿠키/세션 필요시
    );
    return res.data;                 // { clientKey, orderId, amount }
};
const orderId = crypto.randomUUID();
function PaymentButton() {
    const handleClick_basic = async () => {
        try {
            const data = await requestPayment(orderId, 9900);

            const tossPayments = await loadTossPayments(data.clientKey);

            await tossPayments.requestPayment("카드", {
                amount: data.amount,
                orderId: data.orderId,
                orderName: "basic",
                customerName: "홍길동",
                successUrl: "http://localhost:5173/mypage/subscription/success?plan_name=basic", // ✅ vite 포트로 변경
                failUrl: "http://localhost:5173/mypage/subscription/fail"        // ✅ vite 포트로 변경
            });
        } catch (err) {
            console.error("결제 요청 실패:", err);
        }
    };
    const handleClick_standard = async () => {
        try {
            const data = await requestPayment(orderId, 19900);

            const tossPayments = await loadTossPayments(data.clientKey);

            await tossPayments.requestPayment("카드", {
                amount: data.amount,
                orderId: data.orderId,
                orderName: "standard",
                customerName: "더미봇",
                successUrl: "http://localhost:5173/mypage/subscription/success?plan_name=standard", // ✅ vite 포트로 변경
                failUrl: "http://localhost:5173/mypage/subscription/fail"        // ✅ vite 포트로 변경
            });
        } catch (err) {
            console.error("결제 요청 실패:", err);
        }
    };
    const handleClick_premium= async () => {
        try {
            const data = await requestPayment(orderId, 39900);

            const tossPayments = await loadTossPayments(data.clientKey);

            await tossPayments.requestPayment("카드", {
                amount: data.amount,
                orderId: data.orderId,
                orderName: "premium",
                customerName: "더미봇",
                successUrl: "http://localhost:5173/mypage/subscription/success?plan_name=premium", // ✅ vite 포트로 변경
                failUrl: "http://localhost:5173/mypage/subscription/fail"        // ✅ vite 포트로 변경
            });
        } catch (err) {
            console.error("결제 요청 실패:", err);
        }
    };

    return (
        <div className="flex justify-center">
            <PlanCard
                planName="Basic"
                amount={9900}
                benefit="광고 제거 + 문제 20개/일"
                onClick={handleClick_basic}
            />

            <PlanCard
                planName="Standard"
                amount={19900}
                benefit="문제 50개/일 + 통계 제공"
                onClick={handleClick_standard}
            />

            <PlanCard
                planName="Premium"
                amount={39900}
                benefit="문제 100개/일 + AI기반 학습 피드백"
                onClick={handleClick_premium}
            />
        </div>);
}

export default PaymentButton;