// Auth/Login/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/utils/auth.js";
import {useDispatch} from "react-redux";
import {fetchMeThunk} from "@/redux/slices/authSlice.js";
import bgImg from "@/assets/bgImg.png";
import {useModal} from "@/contexts/ModalContext.jsx"; // /auth/login 호출 (이미 구현됨):contentReference[oaicite:5]{index=5}

export default function LoginPage() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const { alert } = useModal();
    const navigate = useNavigate();
    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const dispatch=useDispatch();
    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return alert("이메일/비밀번호를 입력해주세요.");
        setLoading(true);
        try {
            await login(form);
            await dispatch(fetchMeThunk());  // 로그인 성공시 로그인 상태 반영
            navigate("/");                   // 로그인 성공 → 메인으로
        } catch {
            await alert("입력 오류", "비밀번호가 일치하지 않습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative w-full py-10 px-4 text-center bg-[#F8FAF4] backdrop-blur-md shadow-inner snap-start flex flex-col items-center justify-center"
            style={{
                height: 'calc(100vh - 205px)',
            }}
        >
            <div
                className="absolute inset-0 z-0"
                style={{
                    width: '100%',
                    height: 'calc(100vh - 200px)',    // 4rem = header 높이
                    backgroundImage: `url(${bgImg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover", // 또는 'contain', 필요에 따라
                    backgroundPosition: "center",
                    opacity: 0.3,
                    overflowY: 'auto'
                }}
            >
            </div>

            <div className="min-h-[80vh] max-w-[25rem] w-[80%] flex items-center justify-center z-20">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-[#B4E197] p-6">
                    <h1 className="text-2xl font-bold text-[#4E944F] mb-4">로그인</h1>
                    <form onSubmit={onSubmit} className="space-y-3">
                        <div>
                            <label className="block text-sm text-[#4E944F] mb-1">이메일</label>
                            <input name="email" type="email" value={form.email} onChange={onChange}
                                   className="w-full border-2 border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#83BD75]" />
                        </div>
                        <div>
                            <label className="block text-sm text-[#4E944F] mb-1">비밀번호</label>
                            <input name="password" type="password" value={form.password} onChange={onChange}
                                   className="w-full border-2 border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#83BD75]" />
                        </div>
                        <button type="submit" disabled={loading}
                                className={`w-full rounded-xl text-white py-2 ${loading ? "bg-gray-400" : "bg-[#4E944F] hover:bg-[#3a7a3d]"}`}>
                            {loading ? "로그인 중..." : "로그인"}
                        </button>
                    </form>

                    <div className="flex flex-col items-center space-y-3 my-6">
                        {/* 구분선 */}
                        <div className="w-full border-t border-[#E9EFC0] my-4"></div>

                        {/* Google 로그인 */}
                        <a
                            href="http://localhost:8000/auth/google/login"
                            className="hover:opacity-90 transition"
                        >
                            <img
                                src="https://developers.google.com/identity/images/btn_google_signin_light_normal_web.png"
                                alt="구글 로그인"
                                className="w-[14rem] h-[2.75rem]"
                            />
                        </a>

                        {/* Naver 로그인 */}
                        <a
                            href="http://localhost:8000/auth/naver/login"
                            className="hover:opacity-90 transition"
                        >
                            <img
                                src="/btnG.png"
                                alt="네이버 로그인"
                                className="w-[14rem] h-[2.75rem]"
                            />
                        </a>

                        {/* Kakao 로그인 */}
                        <a
                            href="http://localhost:8000/auth/kakao/login"
                            className="hover:opacity-90 transition"
                        >
                            <img
                                src="/kakao_login_medium_narrow.png"
                                alt="카카오 로그인"
                                className="w-[14rem] h-[2.75rem]"
                            />
                        </a>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-4">
                        <a href="/register" className="hover:text-[#4E944F]">회원가입</a>
                        <a href="/find-account" className="hover:text-[#4E944F]">계정 찾기</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
