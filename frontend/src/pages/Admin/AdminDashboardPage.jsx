import {useSelector} from "react-redux";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import {Outlet, useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {toast} from "react-toastify";

export default function AdminDashboardPage() {
    const {loading} = useSelector((state) => state.auth);
    const user=useSelector((state)=>state.auth.user)
    useAuthLoad();
    const navigate=useNavigate()
    useEffect(() => {
        if (user.role !== "admin" && (user.name!=="admin" || user.name!=="어드민"|| user.name!=="관리자")) {
            toast.error("관리자 계정이 아닙니다.", { autoClose: 2000 });
            navigate("/login")// 로그인 사이트으로 이동
        }
    }, [user, navigate]);
    const tabs = [
        { name: "대시 보드", path: "dashboard" },
        { name: "유저 관리", path: "user_ban" },
    ];
    return (
        <div className="flex flex-col items-center w-full p-1">
            <div className="flex gap-2 mb-12 border-b border-[#B4E197] pb-2">
                {!loading && user.role === "admin" && (
                    <nav className="flex gap-4 border-b border-[#B4E197] mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.path}
                                onClick={() => navigate(`/admin/${tab.path}`)}
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