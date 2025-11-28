import {useNavigate, Outlet, useLocation} from "react-router-dom";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import bgImg from "@/assets/bgImg.png";
import book from "@/assets/game.png"
import useCheckUser from "@/hooks/useCheckUser.jsx";

export default function GamesPage() {
    const tabs = [
        { name: "끝말잇기", path: "word-chain" },
        { name: "초성퀴즈", path: "word-meaning" },
        { name: "문장퍼즐", path: "sentence-complete" },
    ];
    const handleClick = (tab) => {
        navigate(`/games/${tab.path}`);
    };
    const navigate = useNavigate();
    const location = useLocation();
    useAuthLoad();
    useCheckUser();
    // 현재 경로가 /games인지 확인
    const isRoot = location.pathname === "/games";

    return (
        <div
            className="relative w-full py-10 px-4 text-center bg-[#F8FAF4] backdrop-blur-md shadow-inner snap-start flex flex-col items-center justify-center"
            style={{
                height: 'calc(100vh - 4rem)',
            }}
        >
            {/* 배경 */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    width: '100%',
                    height: 'calc(100vh - 4rem)',    // 4rem = header 높이
                    backgroundImage: `url(${bgImg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover", // 또는 'contain', 필요에 따라
                    backgroundPosition: "center",
                    opacity: 0.3,
                    overflowY: 'auto'
                }}
            />
            {/* 카드 UI */}
            {isRoot && (
                <div className="relative z-20 flex flex-col items-center w-full font-juache mb-20">
                    <div className="flex gap-[100px] border-gray-300">
                        {tabs.map((tab) => (
                            <div key={tab.name} className="w-[300px] h-[500px] bg-white/90 rounded-2xl shadow-md hover:bg-[#f1ffe0] hover:duration-300 hover:ease-in">
                                <button
                                    onClick={() => handleClick(tab)}
                                    className="w-[200px] h-10 bg-[#cff09e] rounded-2xl mt-10 text-2xl"
                                >
                                    {tab.name}
                                </button>
                                <img
                                    src={book}
                                    alt="book"
                                    className="relative left-[20%] top-[70%] w-[200px] mt-10 float-animation"
                                />
                                <button
                                    onClick={() => handleClick(tab)}
                                    className="w-[150px] h-12 bg-[#4E944F] text-white rounded-2xl mt-10 text-2xl relative top-[20%]"
                                >
                                    <p>놀자!</p>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 선택된 탭 컴포넌트 */}
            {!isRoot && <Outlet />}
        </div>
    );
}