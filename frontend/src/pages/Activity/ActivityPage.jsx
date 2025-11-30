// ActivityPage.jsx
import { NavLink, Outlet } from "react-router-dom";
import bgImg from "@/assets/bgImg.png";

export default function ActivityPage() {
    const tabs = [
        { name: "독서록", path: "reading-log" },
        { name: "일기", path: "daily-writing" },
        { name: "어휘 검색", path: "word-search" },
    ];
    return (
        <div className="flex flex-col min-h-screen relative w-full bg-[#F8FAF4]">

            {/* 배경 이미지 */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: `url(${bgImg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.3,
                }}
            />

            {/* 상단 탭 영역 */}
            <div className="relative z-20 flex flex-col items-center w-full pt-[150px]">
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

            {/* 콘텐츠 영역: 가운데만 스크롤 가능, 내부 Card가 max-height 적용 */}
            <div className="w-full flex justify-center py-4 px-4">
                <div
                    className="
      w-full max-w-5xl bg-white rounded-2xl shadow-md p-8 z-20
      min-h-[100px] max-h-[70vh] overflow-y-auto
      transition-all duration-200
    "
                >
                    <Outlet />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto w-full p-4 text-center bg-[#E9EFC0]">
                © 2025 Your Footer
            </footer>
        </div>
    );
}
