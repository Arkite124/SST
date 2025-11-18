// Auth/Withdraw/WithdrawPage.jsx
import axios from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import { useModal } from "@/contexts/ModalContext.jsx";

export default function WithdrawPage() {
    const navigate = useNavigate();
    const { confirm, alert } = useModal();  // ⬅ alert 추가

    const onWithdraw = async () => {
        const ok = await confirm("탈퇴 확인", "정말 탈퇴하시겠습니까?");
        if (!ok) return;

        try {
            await axios.delete("/users/me", {
                data: {},              // FastAPI delete JSON 대응
                withCredentials: true,
            });
            await alert("탈퇴 완료", "회원 탈퇴가 정상적으로 처리되었습니다.");  // 🔥 커스텀 alert
            navigate("/");
        } catch {
            await alert("오류 발생", "탈퇴 처리 중 문제가 발생했습니다. 다시 시도해주세요.");  // 🔥 커스텀 alert
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#E9EFC0]">
            <div className="bg-white rounded-2xl shadow-md border border-[#B4E197] p-6 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-[#4E944F] mb-4">회원 탈퇴</h1>
                <p className="text-gray-600 mb-6">
                    탈퇴 시 계정 정보 및 개인 데이터가 삭제됩니다.
                </p>
                <button
                    onClick={onWithdraw}
                    className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition"
                >
                    탈퇴하기
                </button>
            </div>
        </div>
    );
}
