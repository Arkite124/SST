import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {socialRegister} from "@/utils/auth.js";
import {
    CheckPhone,
    CheckUserNickname,
} from "@/pages/Auth/Register/RegisterUtil/RegisterUtil.js";
import { useModal } from "@/contexts/ModalContext.jsx";

export default function Social() {
    const { alert, confirm } = useModal();
    const navigate = useNavigate();

    // ⭐ URL에서 token 가져오기
    const [token, setToken] = useState(null);

    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get("token");
        setToken(t);
    }, []);

    const [form, setForm] = useState({
        nickname: "",
        phone: "",
        gender: "",
        age: "",
        key_parent: "",
    });

    const [displayPhone, setDisplayPhone] = useState("");
    const [checkUserNickC, setCheckUserNickC] = useState({});
    const [checkPhoneC, setCheckPhoneC] = useState({});
    const [loading, setLoading] = useState(false);

    const onChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const autoHyphen = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length < 4) return numbers;
        if (numbers.length < 8)
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e) => {
        const raw = e.target.value;
        const hyphened = autoHyphen(raw);
        const clean = raw.replace(/\D/g, "");
        setForm((prev) => ({ ...prev, phone: clean }));
        setDisplayPhone(hyphened);
    };

    const handleCheckNickname = async () => {
        try {
            const res = await CheckUserNickname(form.nickname);
            setCheckUserNickC({
                checkNick: res.data.checkNick,
                nickMessage: res.data.nickMessage,
            });
        } catch {
            setCheckUserNickC({
                checkNick: false,
                nickMessage: "서버 오류가 발생했습니다.",
            });
        }
    };

    const handleCheckPhone = async () => {
        try {
            const res = await CheckPhone(form.phone);
            setCheckPhoneC({
                checkPhone: res.data.checkPhone,
                phoneMessage: res.data.phoneMessage,
            });
        } catch {
            setCheckPhoneC({
                checkPhone: false,
                phoneMessage: "서버 오류가 발생했습니다.",
            });
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        // ⭐ token 확인
        if (!token) {
            await alert("오류", "로그인 인증이 만료되었습니다. 다시 시도해주세요.");
            navigate("/");
            return;
        }

        if (!form.phone || !form.nickname) {
            await alert("입력 오류", "핸드폰 번호, 닉네임은 필수 입력 항목입니다.");
            return;
        }
        if (!checkUserNickC.checkNick) {
            await alert("닉네임 확인 필요", "닉네임 중복확인을 해주세요.");
            return;
        }
        if (!checkPhoneC.checkPhone) {
            await alert("전화번호 확인 필요", "전화번호 중복확인을 해주세요.");
            return;
        }

        setLoading(true);

        try {
            // ⭐ token을 포함해 전달!
            await socialRegister({ ...form, token });

            await confirm("회원가입 완료", "정상적으로 회원가입이 완료되었습니다!");
            navigate("/");
        } catch (err) {
            console.error(err);
            await alert("오류 발생", "회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center bg-[#E9EFC0] p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-md border border-[#B4E197] p-8">
                <h1 className="text-2xl font-bold text-[#4E944F] mb-1 text-center">
                    처음 소셜로그인 하신 분들은 필수적으로 입력해 주세요!
                </h1>
                 <h2 className="text-xl font-bold text-[#4E944F] mb-6 text-center">
                    입력하지 않을 시 정상적인 이용이 어려울 수 있습니다.
                </h2>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* 닉네임 */}
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-700 mb-1">닉네임</span>
                        <div className="flex gap-2">
                            <input
                                name="nickname"
                                value={form.nickname}
                                onChange={onChange}
                                placeholder="닉네임을 입력하세요"
                                className="flex-1 border-2 border-[#B4E197] rounded-xl p-2"
                            />
                            <button
                                type="button"
                                onClick={handleCheckNickname}
                                className="px-3 py-1 bg-slate-200 rounded-lg text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkUserNickC?.nickMessage && (
                            <p className={`text-sm ${checkUserNickC.checkNick ? "text-green-600" : "text-red-600"}`}>
                                {checkUserNickC.nickMessage}
                            </p>
                        )}
                    </label>
                    {/* 전화번호 */}
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-700 mb-1">전화번호</span>
                        <div className="flex gap-2">
                            <input
                            name="phone"
                            value={displayPhone}
                            onChange={handlePhoneChange}
                            placeholder="010-1234-5678"
                            className="flex-1 border-2 border-[#B4E197] rounded-xl p-2"
                            />
                            <button
                                type="button"
                                onClick={handleCheckPhone}
                                className="px-3 py-1 bg-slate-200 rounded-lg text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkPhoneC?.phoneMessage && (
                            <p className={`text-sm ${checkPhoneC.checkPhone ? "text-green-600" : "text-red-600"}`}>
                                {checkPhoneC.phoneMessage}
                            </p>
                        )}
                    </label>
                    {/* 성별 / 나이 */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-sm font-semibold text-gray-700 mb-1">성별</span>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={onChange}
                                className="w-full border-2 border-[#B4E197] rounded-xl p-2"
                            >
                                <option value="">선택</option>
                                <option value="M">남성</option>
                                <option value="F">여성</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="block text-sm font-semibold text-gray-700 mb-1">나이</span>
                            <input
                                name="age"
                                type="number"
                                value={form.age}
                                onChange={onChange}
                                placeholder="나이"
                                className="w-full border-2 border-[#B4E197] rounded-xl p-2"
                            />
                        </label>
                        <label className="block">
                            <span className="block text-sm font-semibold text-gray-700 mb-1">부모 인증키</span>
                            <input
                                name="key_parent"
                                value={form.key_parent}
                                onChange={onChange}
                                placeholder="부모인증키"
                                type={"password"}
                                className="w-full border-2 border-[#B4E197] rounded-xl p-2"
                            />
                        </label>
                    </div>

                    {/* 제출 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-xl text-white font-semibold py-2 transition ${
                            loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#4E944F] hover:bg-[#3a7a3d]"
                        }`}
                    >
                        {loading ? "가입 중..." : "가입하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}
