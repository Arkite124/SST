import { NavLink, Outlet } from "react-router-dom";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

export default function MyPagePage() {
    const tabs = [
        { name: "대시보드", path: "dashboard" },
        { name: "정보 수정", path: "profile-edit" },
        { name: "구독 관리", path: "subscription" },
    ];
    useAuthLoad()
    return (
        <div className="flex flex-col items-center w-full p-10">
            <h1 className="text-3xl font-bold mb-10 text-[#4E944F]">마이페이지</h1>

            {/* 탭 메뉴 */}
            <div className="flex flex-wrap justify-center gap-6 mb-12 border-b border-gray-300 pb-2">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end
                        className={({ isActive }) =>
                            `text-lg font-semibold px-4 pb-2 transition-colors duration-200 ${
                                isActive
                                    ? "border-b-4 border-[#4E944F] text-[#4E944F]"
                                    : "text-gray-500 hover:text-[#4E944F]"
                            }`
                        }
                    >
                        {tab.name}
                    </NavLink>
                ))}
            </div>

            {/* 콘텐츠 출력 */}
            <div className="w-full max-w-6xl">
                <Outlet />
            </div>
        </div>
    );
}
