// Auth/FindAccount/FindAccountPage.jsx
import { useState } from "react";
import axios from "@/utils/axiosInstance.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

export default function FindAccountPage() {
    const [phone, setPhone] = useState("");
    const [foundEmail, setFoundEmail] = useState("");
    const [resetEmail, setResetEmail] = useState("");
    const [sent, setSent] = useState(false);
    const findByPhone = async () => {
        if (!phone) return alert("전화번호를 입력하세요.");
        try {
            const res = await axios.get(`/find_user/${phone}`, { withCredentials: true });
            setFoundEmail(res.data?.email || "");
            if (!res.data?.email) alert("해당 번호로 가입된 이메일이 없습니다.");
        } catch (e) {
            console.error(e); alert("조회 실패");
        }
    };

    const requestPwReset = async () => {
        if (!resetEmail) return alert("이메일을 입력하세요.");
        try {
            await axios.post("/find_user/pw_reset/request", { email: resetEmail }, { withCredentials: true });
            setSent(true);
            alert("비밀번호 재설정 메일이 발송되었습니다.");
        } catch (e) {
            console.error(e); alert("요청 실패");
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center bg-[#E9EFC0] p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-md border border-[#B4E197] p-6 space-y-6">
                <h1 className="text-2xl font-bold text-[#4E944F]">계정 찾기</h1>

                <section>
                    <h2 className="font-semibold text-[#4E944F] mb-2">📱 전화번호로 이메일 찾기</h2>
                    <div className="flex gap-2">
                        <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="010-1234-5678"
                               className="flex-1 border-2 border-[#B4E197] rounded-xl p-2" />
                        <button onClick={findByPhone}
                                className="px-4 bg-[#4E944F] hover:bg-[#3a7a3d] text-white rounded-xl">찾기</button>
                    </div>
                    {foundEmail && <p className="mt-2 text-gray-700">등록 이메일: <strong>{foundEmail}</strong></p>}
                </section>

                <section>
                    <h2 className="font-semibold text-[#4E944F] mb-2">🔐 비밀번호 재설정 요청</h2>
                    <div className="flex gap-2">
                        <input value={resetEmail} onChange={(e)=>setResetEmail(e.target.value)} placeholder="email@example.com"
                               className="flex-1 border-2 border-[#B4E197] rounded-xl p-2" />
                        <button onClick={requestPwReset}
                                className="px-4 bg-[#4E944F] hover:bg-[#3a7a3d] text-white rounded-xl">요청</button>
                    </div>
                    {sent && <p className="mt-2 text-gray-700">메일을 확인해주세요.</p>}
                </section>
            </div>
        </div>
    );
}
