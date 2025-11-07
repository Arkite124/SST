import {NavLink, Outlet, useNavigate} from "react-router-dom";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import bgImg from "@/assets/bgImg.png";
import {useSelector} from "react-redux";
import {useEffect} from "react";
import {toast} from "react-toastify";

export default function GamesPage() {
    const tabs = [
        { name: "끝말잇기", path: "word-chain" },
        { name: "단어 뜻 맞추기", path: "word-meaning" },
        { name: "문장 완성하기", path: "sentence-complete" },
    ];
    const navigate=useNavigate()
    useAuthLoad()
    const { user } = useSelector((state) => state.auth);
    useEffect(() => {
        if (user == null) {
            toast.error("이용하려면 로그인 해주세요.", { autoClose: 2000 });
            navigate("/login")// 로그인 사이트으로 이동
        }
    }, [user, navigate]);
    return (
        <div
            className="relative w-full py-10 px-4 text-center bg-[#F8FAF4] backdrop-blur-md shadow-inner snap-start flex flex-col items-center justify-center"
            style={{
                height: 'calc(100vh - 205px)',
            }}
        >
            {/* 배경 */}
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
            />
            {/* 탭 */}
            <div className="relative z-20 flex flex-col items-center w-full">
                <div className="flex gap-8 border-gray-300">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) =>
                                `text-lg font-semibold px-4 pb-2 transition-colors duration-200 ${
                                    isActive
                                        ? "border-b-4 border-orange-500 text-orange-600"
                                        : "text-gray-500 hover:text-orange-500"
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
