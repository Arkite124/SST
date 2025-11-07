import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "@/utils/auth.js";
import {
    CheckEmail,
    CheckPhone,
    CheckPwCorrect,
    CheckUserNickname,
} from "@/pages/Auth/Register/RegisterUtil/RegisterUtil.js";

export default function RegisterPage() {
    const [form, setForm] = useState({
        email: "",
        name: "",
        password: "",
        nickname: "",
        phone: "",
        gender: "",
        age: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [checkPwC, setCheckPwC] = useState({});
    const [checkEmailAdd, setCheckEmailAdd] = useState({});
    const [checkUserNickC, setCheckUserNickC] = useState({});
    const [checkPhoneC, setCheckPhoneC] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    useEffect(() => {
        if (form.password && confirmPassword) {
            const fetchCheck = async () => {
                try {
                    const res = await CheckPwCorrect({
                        password: form.password,
                        confirmPassword: confirmPassword,
                    });
                    setCheckPwC({
                        checkPw: res.data.checkPw,
                        pwMessage: res.data.pwMessage,
                    });
                } catch {
                    console.error("비밀번호 확인 실패");
                }
            };
            fetchCheck();
        }
    }, [form.password, confirmPassword]);

    const handleCheckEmail = async () => {
        try {
            const res = await CheckEmail(form.email);
            setCheckEmailAdd({
                checkEmail: res.data.checkEmail,
                message: res.data.message,
            });
        } catch {
            console.log("이메일 확인 오류");
        }
    };

    const handleCheckNickname = async () => {
        try {
            const res = await CheckUserNickname(form.nickname);
            setCheckUserNickC({
                checkNick: res.data.checkNick,
                nickMessage: res.data.nickMessage,
            });
        } catch {
            console.log("닉네임 확인 오류");
        }
    };

    const handleCheckPhone = async () => {
        try {
            const res = await CheckPhone(form.phone);
            setCheckPhoneC({
                checkPhone: res.data.checkPhone,
                phoneMessage: res.data.phoneMessage,
            });
        } catch (e) {
            console.log(e.message);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password || !form.name)
            return alert("필수 항목을 입력해주세요.");

        setLoading(true);
        try {
            await register(form);
            alert("회원가입이 완료되었습니다.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            alert("회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center bg-[#E9EFC0] p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-md border border-[#B4E197] p-8">
                <h1 className="text-2xl font-bold text-[#4E944F] mb-6 text-center">
                    회원가입
                </h1>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* 이메일 */}
                    <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              이메일
            </span>
                        <div className="flex gap-2">
                            <input
                                name="email"
                                value={form.email}
                                onChange={onChange}
                                placeholder="이메일을 입력하세요"
                                className="flex-1 border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                            <button
                                type="button"
                                onClick={handleCheckEmail}
                                className="px-3 py-1 border border-slate-300 rounded-lg bg-slate-200 text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkEmailAdd?.message && (
                            <span
                                className={`text-sm mt-1 ${
                                    checkEmailAdd.checkEmail ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {checkEmailAdd.message}
                            </span>
                        )}
                    </label>
                    {/* 비밀번호 */}
                    <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호
                    </span>
                        <div className="flex flex-col gap-2">
                            <input
                                name="password"
                                type="password"
                                placeholder="비밀번호"
                                onChange={onChange}
                                className="border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="비밀번호 확인"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                            {form.password && confirmPassword && (
                                <p
                                    className={`text-sm ${
                                        checkPwC.checkPw ? "text-green-600" : "text-red-600"
                                    }`}
                                >
                                    {checkPwC.pwMessage}
                                </p>
                            )}
                        </div>
                    </label>
                    {/* 이름 */}
                    <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              이름
            </span>
                        <input
                            name="name"
                            value={form.name}
                            onChange={onChange}
                            placeholder="이름을 입력하세요"
                            className="w-full border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                        />
                    </label>

                    {/* 닉네임 */}
                    <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              닉네임
            </span>
                        <div className="flex gap-2">
                            <input
                                name="nickname"
                                value={form.nickname}
                                onChange={onChange}
                                placeholder="닉네임을 입력하세요"
                                className="flex-1 border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                            <button
                                type="button"
                                onClick={handleCheckNickname}
                                className="px-3 py-1 border border-slate-300 rounded-lg bg-slate-200 text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkUserNickC?.nickMessage && (
                            <p
                                className={`text-sm mt-1 ${
                                    checkUserNickC.checkNick ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {checkUserNickC.nickMessage}
                            </p>
                        )}
                    </label>

                    {/* 전화번호 */}
                    <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              전화번호
            </span>
                        <div className="flex gap-2">
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={onChange}
                                placeholder="010-1234-5678"
                                className="flex-1 border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                            <button
                                type="button"
                                onClick={handleCheckPhone}
                                className="px-3 py-1 border border-slate-300 rounded-lg bg-slate-200 text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkPhoneC?.phoneMessage && (
                            <p
                                className={`text-sm mt-1 ${
                                    checkPhoneC.checkPhone ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {checkPhoneC.phoneMessage}
                            </p>
                        )}
                    </label>

                    {/* 성별 + 나이 */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1">
                성별
              </span>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={onChange}
                                className="w-full border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            >
                                <option value="">선택</option>
                                <option value="M">남성</option>
                                <option value="F">여성</option>
                            </select>
                        </label>

                        <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1">
                나이
              </span>
                            <input
                                name="age"
                                type="number"
                                value={form.age}
                                onChange={onChange}
                                placeholder="나이"
                                className="w-full border-2 border-[#B4E197] rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#4E944F]"
                            />
                        </label>
                    </div>

                    {/* 제출 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-xl text-white font-semibold py-2 transition ${
                            loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-[#4E944F] hover:bg-[#3a7a3d]"
                        }`}
                    >
                        {loading ? "가입 중..." : "가입하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}