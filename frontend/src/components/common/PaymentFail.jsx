import { useSearchParams } from "react-router-dom";

function PaymentFail() {
    const [searchParams] = useSearchParams();

    const code = searchParams.get("code");
    const message = searchParams.get("message");

    return (
        <div className="p-6 bg-red-50 rounded-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">결제 실패 ❌</h1>
            <p className="text-gray-700">코드: <span className="font-mono">{code}</span></p>
            <p className="text-gray-700">사유: <span className="font-semibold">{message}</span></p>
            <button
                onClick={() => window.location.href = "/mypage/subscription"}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
            >
                다시 시도하기
            </button>
        </div>
    );
}

export default PaymentFail;
