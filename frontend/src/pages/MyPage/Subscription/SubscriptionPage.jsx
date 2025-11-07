import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import Card from "@/components/common/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { toast } from "react-toastify";
import PlanCard from "@/components/subscription/PlanCard.jsx";
import { loadTossPayments } from "@tosspayments/payment-sdk";

function SubscriptionPage() {
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [size] = useState(10);

    // 구독 상태 & 내역 불러오기
    useEffect(() => {
        const fetchSubscriptionData = async () => {
            try {
                const [statusRes, historyRes] = await Promise.all([
                    axiosInstance.get("/subscription/status", { withCredentials: true }),
                    axiosInstance.get(`/subscription/history?page=${page}&size=${size}`, {
                        withCredentials: true,
                    }),
                ]);
                setStatus(statusRes.data);
                setHistory(historyRes.data || []);
            } catch (err) {
                console.error("구독 정보 불러오기 실패:", err);
                toast.error("구독 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchSubscriptionData();
    }, [page, size]);

    // ✅ 구독 시작 (billing/authorize)
    const handleSubscribe = async (planName, amount) => {
        try {
            const tossPayments = await loadTossPayments("test_ck_DpexMgkW36wOX7jqnzYMVGbR5ozO"); // ✅ 클라이언트 키 입력
            const origin = window.location.origin;

            await tossPayments.requestBillingAuth("카드", {
                customerKey: `user-${crypto.randomUUID()}`, // UUID 권장
                successUrl: `${origin}/mypage/subscription/success?plan_name=${planName}&amount=${amount}`,
                failUrl: `${origin}/mypage/subscription/fail`,
            });

            // 결제창이 뜨면 여기서부터는 토스에서 처리 → success/fail 페이지로 redirect
        } catch (err) {
            console.error("구독 시작 실패:", err);
            toast.error("구독 시작에 실패했습니다.");
        }
    };
    // ✅ 구독 취소
    const handleCancel = async (subscriptionId) => {
        try {
            await axiosInstance.post(
                `/subscription/billing/cancel/${subscriptionId}`,
                {},
                { withCredentials: true }
            );
            toast.success("구독이 해지되었습니다.");
            setStatus(null);
        } catch (err) {
            console.error("구독 해지 실패:", err);
            toast.error("구독 해지에 실패했습니다.");
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-6 bg-[#E9EFC0] min-h-screen">
            <h1 className="text-3xl font-bold text-[#4E944F] mb-6">💳 구독 관리</h1>

            {/* 현재 구독 상태 */}
            <Card className="bg-white border border-[#B4E197] rounded-2xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#4E944F] mb-3">현재 구독 상태</h2>
                {!status || !status.active ? (
                    <p className="text-green-500">확인된 구독정보가 없습니다.</p>
                ) : (
                    <div className="text-green-600">
                        <p>
                            📌 현재 플랜:{" "}
                            <span className="font-semibold text-green-800">
                {status.plan_name}
              </span>
                        </p>
                        <p>
                            ⏳ 만료일:{" "}
                            <span className="font-semibold text-green-800">
                {status.end_date}
              </span>
                        </p>
                        {status.next_plan && (
                            <p>
                                🔜 다음 결제부터:{" "}
                                <span className="font-semibold text-blue-700">
                  {status.next_plan.plan_name} ({status.next_plan.amount}원)
                </span>
                            </p>
                        )}
                        <button
                            onClick={() => handleCancel(status.id)}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
                        >
                            구독 해지
                        </button>
                    </div>
                )}
            </Card>

            {/* 결제 내역 */}
            <Card className="bg-white border border-[#B4E197] rounded-2xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#4E944F] mb-3">📜 구독 내역</h2>
                {history.length === 0 ? (
                    <p className="text-gray-500">구독 내역이 없습니다.</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="border-b border-[#B4E197] text-[#4E944F]">
                            <th className="py-2">플랜</th>
                            <th className="py-2">결제일</th>
                            <th className="py-2">만료일</th>
                            <th className="py-2">금액</th>
                        </tr>
                        </thead>
                        <tbody>
                        {history.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#E9EFC0]">
                                <td className="py-2">{item.plan_name}</td>
                                <td className="py-2">
                                    {new Date(item.paid_at).toLocaleDateString()}
                                </td>
                                <td className="py-2">
                                    {new Date(item.end_date).toLocaleDateString()}
                                </td>
                                <td className="py-2">
                                    {item.amount?.toLocaleString()}원
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* 새 구독 시작 버튼들 */}
            <div className="flex gap-4">
                <PlanCard
                    planName="Basic"
                    amount={7900}
                    benefits={[
                        "게임 가능 횟수: 3회",
                        "문장퍼즐 문제 5개",
                        "초성퀴즈: pos=1, 난이도 3종 제공",
                        "끝말잇기: 1:컴퓨터",
                        "테스트 가능 횟수: 하루 각 1회",
                        "학부모 대시보드: 기본만 제공",
                        "AI 분석 기능: 지원 안함",
                    ]}
                    onClick={() => handleSubscribe("basic", 7900)}
                />

                <PlanCard
                    planName="Standard"
                    amount={19900}
                    benefits={[
                        "게임 가능 횟수: 4회",
                        "문장퍼즐 문제 7개",
                        "초성퀴즈: pos 다중선택, 난이도 3종 제공",
                        "끝말잇기: 1:컴퓨터",
                        "테스트 가능 횟수: 하루 각 1회",
                        "학부모 대시보드: 기본 + standard",
                        "AI 분석 기능: 독후감 분석 지원",
                    ]}
                    onClick={() => handleSubscribe("standard", 19900)}
                />

                <PlanCard
                    planName="Premium"
                    amount={29900}
                    benefits={[
                        "게임 가능 횟수: 5회",
                        "문장퍼즐 문제 10개",
                        "초성퀴즈: pos 다중선택, 난이도 3종 + 속담 제공",
                        "끝말잇기: 1:컴퓨터, 1:1",
                        "테스트 가능 횟수: 하루 각 2회",
                        "학부모 대시보드: 모든 요소 제공",
                        "AI 분석 기능: 독후감 + 일기 지원",
                    ]}
                    onClick={() => handleSubscribe("premium", 29900)}
                />

            </div>
        </div>
    );
}

export default SubscriptionPage;
