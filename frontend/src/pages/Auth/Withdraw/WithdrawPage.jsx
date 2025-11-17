// Auth/Withdraw/WithdrawPage.jsx
import axios from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import {useModal} from "@/contexts/ModalContext.jsx";

export default function WithdrawPage() {
    const navigate = useNavigate();
    const {confirm}=useModal();
    const onWithdraw = async () => {
        const ok = await confirm("탈퇴 확인", "정말 탈퇴하시겠습니까?");
        if (!ok) return;
        try {
            await axios.delete("/users/me", { data: {}, withCredentials: true }); // 빈 data 포함 주의사항 반영
            alert("탈퇴가 완료되었습니다.");
            navigate("/");
        } catch (e) {
            console.error(e); alert("탈퇴 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#E9EFC0]">
            <div className="bg-white rounded-2xl shadow-md border border-[#B4E197] p-6 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-[#4E944F] mb-4">회원 탈퇴</h1>
                <p className="text-gray-600 mb-6">탈퇴 시 모든 개인 데이터가 삭제될 수 있습니다.</p>
                <button onClick={onWithdraw}
                        className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white">탈퇴하기</button>
            </div>
        </div>
    );
}
