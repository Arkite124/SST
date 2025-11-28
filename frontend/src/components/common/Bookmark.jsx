import React from 'react';
import { useNavigate } from 'react-router-dom';

const Bookmark = ({ tabs, type = 'game' }) => {
    const navigate = useNavigate();

    const colorSchemes = {
        game: {
            bookmark: 'bg-[#cff09e]',
            text: 'text-[#3d5919]',
            hover: 'hover:translate-x-[5px] hover:duration-200 hover:ease-in-out'
        },
    };

    const colors = colorSchemes[type] || colorSchemes.default;

    return (
        <div className="flex flex-col gap-4">
                {tabs?.map((tab, index) => (
                    <div key={tab.path || index} className={`relative rotate-180 scale-[60%] flex items-center ${colors.hover}`}>
                        {/* 톱니 부분 */}
                        <div
                            className="
                                relative z-20 w-[60px] left-[140px] rotate-90 border-none bg-white [--a:90deg] [--s:15px] [--b:3px]
                            "
                            style={{
                                height: "calc(var(--b) + var(--s)/(2*tan(var(--a)/2)))",
                                "--_g":
                                    "var(--s) repeat-x conic-gradient(from calc(var(--a)/-2) at bottom, #0000, #000 1deg calc(var(--a) - 1deg), #0000 var(--a))",
                                mask:
                                    "50% calc(-1 * var(--b)) / var(--_g) exclude, 50% / var(--_g)"
                            }}
                        ></div>

                        {/* 흰색 삼각형 */}
                        <div
                            className="relative left-10 z-10 w-[28px] h-[35px] bg-white"
                            style={{
                                clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)"
                            }}
                        ></div>

                        {/* 색상 삼각형 */}
                        <div
                            className={`w-16 h-20 ${colors.bookmark}`}
                            style={{
                                clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)"
                            }}
                        ></div>

                        {/* 북마크 본체 - 클릭 가능한 버튼 */}
                        <button
                            onClick={() => navigate(tab.path)}
                            className={`
                                w-40 h-20 ${colors.bookmark} 
                                flex items-center justify-center rotate-180 
                                transition-colors duration-200 cursor-pointer
                                ${colors.text} font-juache text-3xl
                            `}
                        >
                            {tab.name}
                        </button>
                    </div>
                ))}
        </div>
    );
};

export default Bookmark;