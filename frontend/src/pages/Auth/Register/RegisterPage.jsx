import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "@/utils/auth.js";
import {
    CheckEmail,
    CheckPhone,
    CheckPwCorrect,
    CheckUserNickname,
} from "@/pages/Auth/Register/RegisterUtil/RegisterUtil.js";
import { useModal } from "@/contexts/ModalContext";

export default function RegisterPage() {
    const { alert } = useModal();  // ⭐ alert modal 사용
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        name: "",
        password: "",
        nickname: "",
        phone: "",        // ⭐ 서버로 보낼 실제 전화번호 (숫자만)
        gender: "",
        age: "",
    });

    const [displayPhone, setDisplayPhone] = useState(""); // ⭐ 화면에만 보일 마스킹 번호
    const [confirmPassword, setConfirmPassword] = useState("");

    // 중복 체크 상태
    const [checkPwC, setCheckPwC] = useState({});
    const [checkEmailAdd, setCheckEmailAdd] = useState({});
    const [checkUserNickC, setCheckUserNickC] = useState({});
    const [checkPhoneC, setCheckPhoneC] = useState({});
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    // -----------------------------
    // ⭐ 전화번호 마스킹 + 원본 저장
    // -----------------------------
    const formatMaskedPhone = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 3) return numbers;

        if (numbers.length <= 7)
            return `${numbers.slice(0, 3)}-${"****".slice(0, numbers.length - 3)}`;

        return `${numbers.slice(0, 3)}-****-****`;
    };

    const handlePhoneChange = (e) => {
        const raw = e.target.value;
        const clean = raw.replace(/\D/g, ""); // 숫자만

        setForm((prev) => ({ ...prev, phone: clean }));      // ⭐ 서버에 보낼 값
        setDisplayPhone(formatMaskedPhone(raw));              // ⭐ 화면용 마스킹
    };

    // -----------------------------
    // ⭐ 비밀번호 검증
    // -----------------------------
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
                    setCheckPwC({
                        checkPw: false,
                        pwMessage: "서버 오류가 발생했습니다.",
                    });
                }
            };
            fetchCheck();
        }
    }, [form.password, confirmPassword]);

    // -----------------------------
    // ⭐ 이메일 중복확인
    // -----------------------------
    const handleCheckEmail = async () => {
        try {
            const res = await CheckEmail(form.email);
            setCheckEmailAdd({
                checkEmail: res.data.checkEmail,
                message: res.data.message,
            });
        } catch {
            setCheckEmailAdd({
                checkEmail: false,
                message: "서버 오류가 발생했습니다.",
            });
        }
    };

    // -----------------------------
    // ⭐ 닉네임 중복확인
    // -----------------------------
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

    // -----------------------------
    // ⭐ 전화번호 중복확인
    // -----------------------------
    const handleCheckPhone = async () => {
        try {
            const res = await CheckPhone(form.phone); // ⭐ clean phone 사용
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

    // -----------------------------
    // ⭐ 회원가입 제출
    // -----------------------------
    const onSubmit = async (e) => {
        e.preventDefault();

        // 필수 입력 확인
        if (!form.email || !form.password || !form.name) {
            await alert("입력 오류", "이메일, 비밀번호, 이름은 필수 입력 항목입니다.");
            return;
        }

        // ⭐ 4가지 중복 확인 모두 True여야 가입됨
        if (!checkEmailAdd.checkEmail) {
            await alert("이메일 확인 필요", "이메일 중복확인을 해주세요.");
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
        if (!checkPwC.checkPw) {
            await alert("비밀번호 불일치", "비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);

        try {
            await register(form); // ⭐ 서버에는 clean phone이 들어감
            await alert("회원가입 완료", "정상적으로 회원가입이 완료되었습니다!");
            navigate("/login");
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
                <h1 className="text-2xl font-bold text-[#4E944F] mb-6 text-center">
                    회원가입
                </h1>

                <form onSubmit={onSubmit} className="space-y-4">

                    {/* 이메일 */}
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-700 mb-1">이메일</span>
                        <div className="flex gap-2">
                            <input
                                name="email"
                                value={form.email}
                                onChange={onChange}
                                placeholder="이메일을 입력하세요"
                                className="flex-1 border-2 border-[#B4E197] rounded-xl p-2"
                            />
                            <button
                                type="button"
                                onClick={handleCheckEmail}
                                className="px-3 py-1 bg-slate-200 rounded-lg text-sm hover:bg-slate-700 hover:text-white"
                            >
                                중복확인
                            </button>
                        </div>
                        {checkEmailAdd?.message && (
                            <span className={`text-sm mt-1 ${checkEmailAdd.checkEmail ? "text-green-600" : "text-red-600"}`}>
                                {checkEmailAdd.message}
                            </span>
                        )}
                    </label>

                    {/* 비밀번호 */}
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</span>
                        <div className="flex flex-col gap-2">
                            <input
                                name="password"
                                type="password"
                                placeholder="비밀번호"
                                onChange={onChange}
                                className="border-2 border-[#B4E197] rounded-xl p-2"
                            />
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="비밀번호 확인"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="border-2 border-[#B4E197] rounded-xl p-2"
                            />
                            {form.password && confirmPassword && (
                                <p className={`text-sm ${checkPwC.checkPw ? "text-green-600" : "text-red-600"}`}>
                                    {checkPwC.pwMessage}
                                </p>
                            )}
                        </div>
                    </label>

                    {/* 이름 */}
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-700 mb-1">이름</span>
                        <input
                            name="name"
                            value={form.name}
                            onChange={onChange}
                            placeholder="이름을 입력하세요"
                            className="w-full border-2 border-[#B4E197] rounded-xl p-2"
                        />
                    </label>

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
                                placeholder="010-****-****"
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
