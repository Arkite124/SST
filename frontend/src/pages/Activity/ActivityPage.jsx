import {NavLink, Outlet, useNavigate} from "react-router-dom";
import bgImg from "@/assets/bgImg.png";

export default function ActivityPage() {
    const tabs = [
        { name: "독서록", path: "reading-log" },
        { name: "일기", path: "daily-writing" },
        { name: "어휘 검색", path: "word-search" },
    ];
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
                    height: 'calc(100vh - 205px)',    // 4rem = header 높이
                    backgroundImage: `url(${bgImg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover", // 또는 'contain', 필요에 따라
                    backgroundPosition: "center",
                    opacity: 0.3,
                    overflowY: 'auto'
                }}
            >
            </div>
            <div className="relative z-20 flex flex-col items-center w-full">
                <div className="flex flex-wrap justify-center gap-6">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            end
                            className={({ isActive }) =>
                                `text-lg font-semibold px-5 pb-2 rounded-t-lg transition-all duration-200 ${
                                    isActive
                                        ? "text-[#4E944F] border-b-4 border-[#4E944F] bg-[#E9EFC0]"
                                        : "text-gray-500 hover:text-[#4E944F] hover:bg-[#F3F8E4]"
                                }`
                            }
                        >
                            {tab.name}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-md p-8 z-20">
                <Outlet />
            </div>
        </div>
    );
}
