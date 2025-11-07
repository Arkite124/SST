import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance.js";
import { toast } from "react-toastify";

function SuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const billingKey = searchParams.get("billingKey");
        const customerKey = searchParams.get("customerKey");
        const plan = searchParams.get("plan");
        const amount = parseInt(searchParams.get("amount"), 10);

        if (billingKey) {
            axiosInstance.post("/subscription/billing/confirm", {
                billingKey,
                customerKey,
                plan_name: plan,
                amount: amount
            }, { withCredentials: true })
                .then(() => {
                    toast.success("구독 등록 완료!");
                    navigate("/subscription");
                })
                .catch((err) => {
                    console.error("구독 등록 실패:", err);
                    toast.error("구독 등록 실패");
                });
        }
    }, []);

    return <p>구독 등록 처리중...</p>;
}

export default SuccessPage;
