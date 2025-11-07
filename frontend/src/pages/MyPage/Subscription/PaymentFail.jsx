import { useSearchParams } from "react-router-dom";

function PaymentFail() {
    const [searchParams] = useSearchParams();

    const code = searchParams.get("code");
    const message = searchParams.get("message");

    return (
        <div>
            <h1>결제 실패 ❌</h1>
            <p>코드: {code}</p>
            <p>사유: {message}</p>
        </div>
    );
}

export default PaymentFail;
