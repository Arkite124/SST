import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchMeThunk, logoutThunk } from "@/redux/slices/authSlice.js";
import { FaUserCog } from "react-icons/fa";

function Header() {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);
    const { user, status } = auth;
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (status === "succeeded") {
            dispatch(fetchMeThunk());
        }
    }, [dispatch, status]);

    const handleLogout = (e) => {
        e.preventDefault();
        dispatch(logoutThunk());
        navigate("/");
    };

    const navItems = [
        { path: "/activity", label: "생활글쓰기" },
        { path: "/community", label: "소통의 장" },
        { path: "/tests", label: "어휘 실력" },
        { path: "/games", label: "어휘 놀이" },
    ];

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="flex items-center px-4 lg:px-20 py-2 relative">

                {/* 모바일 로고: 가운데 정렬
        md 이상에서는 static 으로 원래 자리 복귀 */}
                <Link
                    to="/"
                    className="flex items-center absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
                >
                    <img
                        src={logoImg}
                        alt="새싹톡 로고"
                        className="h-10 md:h-12"
                        style={{ marginLeft: "20px", marginBottom: "-5px", marginTop: "-5px" }}
                    />
                </Link>

                {/* nav는 md 이상에서만 보여서 모바일에 영향 없음 */}
                <nav className="hidden md:flex flex-1 justify-center space-x-12 font-juache text-2xl items-center pt-3">
                    {navItems.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`pb-1 transition-colors ${
                                isActive(path)
                                    ? "text-[#cff09e] border-b-2 border-[#cff09e]"
                                    : "text-[#3d5919] hover:text-[#3d5919]"
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* 모바일 햄버거 버튼: 오른쪽 정렬 */}
                <button
                    className="md:hidden text-3xl text-[#3d5919] ml-auto"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>

                {/* md 이상 오른쪽 로그인/마이페이지 */}
                <div className="hidden md:flex items-center space-x-4 ml-auto">
                    {user == null ? (
                        <Link
                            to="/login"
                            className="px-4 py-1.5 rounded-xl text-white font-semibold bg-[#3d5919] hover:bg-[#4E944F] transition-colors"
                        >
                            로그인
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/mypage/dashboard"
                                className={`pb-1 ${
                                    isActive("/mypage")
                                        ? "text-[#cff09e] border-[#cff09e] font-juache text-xl mb-[-10px]"
                                        : "text-[#3d5919] hover:text-[#3d5919] font-juache text-xl mb-[-10px]"
                                }`}
                            >
                                {user?.name} 님의 활동
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-1.5 rounded-xl text-white font-semibold bg-[#3d5919] hover:bg-[#4E944F] transition-colors"
                            >
                                로그아웃
                            </button>
                            {user?.role === "admin" && (
                                <Link
                                    to="/admin/dashboard"
                                    title="관리자 대시보드"
                                    className="text-[#3d5919] hover:text-[#cff09e] transition"
                                >
                                    <FaUserCog className="text-2xl" />
                                </Link>
                            )}
                        </>
                    )}
                </div>

            </div>


            {/* ✅ 모바일 메뉴 */}
            {menuOpen && (
                <div className="font-juache md:hidden bg-white border-t border-[#3d5919]-200 px-6 py-4 space-y-2 text-xl shadow-sm">
                    {navItems.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => setMenuOpen(false)}
                            className={`block ${
                                isActive(path)
                                    ? "text-[#cff09e]"
                                    : "text-[#3d5919] hover:text-[#3d5919]"
                            }`}
                        >
                            {label}
                        </Link>
                    ))}

                    {user == null ? (
                        <Link
                            to="/login"
                            onClick={() => setMenuOpen(false)}
                            className="block bg-[#3d5919] text-white rounded-full text-center py-1.5 font-semibold"
                        >
                            로그인
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/mypage/dashboard"
                                onClick={() => setMenuOpen(false)}
                                className={`block ${
                                    isActive("/mypage")
                                        ? "text-[#cff09e] font-semibold"
                                        : "text-[#3d5919] hover:text-[#3d5919]"
                                }`}
                            >
                                나의 활동
                            </Link>

                            <button
                                onClick={() => {
                                    handleLogout();
                                    setMenuOpen(false);
                                }}
                                className="block text-[#3d5919] hover:text-[#4E944F]"
                            >
                                로그아웃
                            </button>

                            {user?.role === "admin" && (
                                <Link
                                    to="/admin/dashboard"
                                    onClick={() => setMenuOpen(false)}
                                    className="block text-[#3d5919] font-semibold"
                                >
                                    관리자
                                </Link>
                            )}
                        </>
                    )}
                </div>
            )}
        </header>
    );
}

export default Header;
