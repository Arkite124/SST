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
            <div className="flex items-center justify-between px-4 lg:px-20 2xl:px-[300px] py-2 lg:py-4">
                {/* ✅ 왼쪽: 로고 */}
                <Link to="/" className="flex items-center">
                    <img
                        src={logoImg}
                        alt="새싹톡 로고"
                        className="
              h-10    /* 모바일 */
              lg:h-14 /* 데스크탑 */
            "
                        style={{ marginLeft: "20px", marginBottom: "-5px", marginTop: "-5px" }}
                    />
                </Link>

                {/* ✅ 가운데: navItems */}
                <nav className="hidden md:flex flex-1 justify-center space-x-12 font-normal text-2xl items-center pt-3 font-juache">
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

                {/* ✅ 오른쪽: 로그인/마이페이지/로그아웃 */}
                <div className="hidden md:flex items-center space-x-4">
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
                                        ? "text-[#cff09e] border-b-2 border-[#cff09e]"
                                        : "text-[#3d5919] hover:text-[#3d5919]"
                                }`}
                            >
                                마이페이지
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-[#3d5919] hover:text-[#4E944F] text-sm"
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

                {/* ✅ 모바일 메뉴 버튼 */}
                <button
                    className="md:hidden text-3xl text-[#3d5919]"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>
            </div>

            {/* ✅ 모바일 메뉴 */}
            {menuOpen && (
                <div className="md:hidden bg-white border-t border-[#3d5919]-200 px-6 py-4 space-y-3 text-lg shadow-sm">
                    {navItems.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => setMenuOpen(false)}
                            className={`block ${
                                isActive(path)
                                    ? "text-[#cff09e] font-semibold"
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
