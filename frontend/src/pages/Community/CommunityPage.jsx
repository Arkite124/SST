import {NavLink, Outlet, useNavigate} from "react-router-dom";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import { useSelector } from "react-redux";
import {useEffect} from "react";
import {toast} from "react-toastify";

export default function CommunityPage() {
    const { parent, loading } = useSelector((state) => state.parent);
    useAuthLoad();
    const navigate=useNavigate()
    const tabs = [
        { name: "학생 토론", path: "student-discussion" },
        // ✅ parent_token 인증 완료 후에만 부모 커뮤니티 표시
        ...(!loading && parent!=null ? [{ name: "부모 커뮤니티", path: "parent-board" }] : []),
    ];
    const user  = useSelector((state) => state.auth.user);
    useEffect(() => {
        if (user == null) {
            toast.error("이용하려면 로그인 해주세요.", { autoClose: 2000 });
            navigate("/login")// 로그인 사이트으로 이동
        }
    }, [user, navigate]);
    return (
        <div className="flex flex-col items-center w-full p-1">
            <div className="flex gap-2 mb-12 border-b border-[#B4E197] pb-2">
                {!loading && parent != null && (
                    <nav className="flex gap-4 border-b border-[#B4E197] mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.path}
                                onClick={() => navigate(`/community/${tab.path}`)}
                                className={`px-4 py-2 rounded-t-xl font-semibold ${
                                    location.pathname.includes(tab.path)
                                        ? "bg-[#4E944F] text-white"
                                        : "bg-[#E9EFC0] text-[#4E944F] hover:bg-[#B4E197]"
                                }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                )}
            </div>

            <div className="w-full max-w-5xl">
                <Outlet />
            </div>
        </div>
    );
}