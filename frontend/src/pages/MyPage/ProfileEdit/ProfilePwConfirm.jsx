import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";

export default function ProfilePwConfirm() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await axiosInstance.post("/users/confirm-password", { password }, { withCredentials: true });
            if (res.data.confirmed) {
                navigate("/mypage/profile-edit");
            }
        } catch (err) {
            setError(err.response?.data?.detail || "비밀번호 확인 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FDF4]">
            <div className="bg-white p-8 rounded-2xl shadow-md w-[24rem]">
                <h1 className="text-2xl font-bold text-[#4E944F] mb-6">비밀번호 확인</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="현재 비밀번호를 입력하세요"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-white font-semibold transition-colors ${
                            loading ? "bg-gray-400" : "bg-[#4E944F] hover:bg-[#3a7a3d]"
                        }`}
                    >
                        {loading ? "확인 중..." : "확인"}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </div>
        </div>
    );
}
