import { useState } from "react";
import ReadingTest from "@/pages/Tests/ReadingTest/ReadingTest";
import VocabularyTest from "@/pages/Tests/VocabularyTest/VocabularyTestPage";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import bgImg from "@/assets/bgImg.png";
import read from "@/assets/read.png";
import voca from "@/assets/vocabulary.png";

export default function TestsPage() {
    const [selectedTest, setSelectedTest] = useState(null);
    useAuthLoad();

    return (
        <>
            <div
                className="relative w-full py-10 px-4 text-center bg-[#F8FAF4] backdrop-blur-md shadow-inner snap-start flex flex-col items-center justify-center"
                style={{
                    height: 'calc(100vh - 4rem)',
                }}
            >
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
                ></div>
                <div className="relative z-20 flex flex-col items-center w-full p-10">
                    {!selectedTest ? (
                        <>
                            <div className="flex gap-10">
                                <button
                                    onClick={() => setSelectedTest("reading")}
                                    className="flex-1 py-4 bg-white/90 text-gray-700 font-semibold rounded-2xl shadow
                                    hover:bg-[#f1ffe0] hover:text-[#3d5919] transition-colors duration-200
                                    w-[500px] h-[500px] relative flex flex-col items-center justify-center gap-4"
                                >
                                    <img
                                        src={read}
                                        alt="reading"
                                        className="w-[120px]"
                                    />
                                    <div className="text-2xl font-bold text-center">
                                        연령 맞춤별<br/>문해력 테스트
                                    </div>
                                    <div className="text-lg leading-tight">
                                        내 문해력은<br/>얼마나 될까?
                                    </div>
                                    <div className="relative top-5 px-7 py-1 text-xl bg-[#3d5919] text-white rounded-2xl">
                                        확인해보기
                                    </div>
                                    <img
                                        src="https://media.tenor.com/U8xIb-q6zmUAAAAj/venezuela-parrot.gif"
                                        alt="parrot"
                                        className="scale-x-[-1] w-[80px] absolute top-[450px] right-[320px] -z-10"
                                    />
                                </button>
                                <button
                                    onClick={() => setSelectedTest("vocabulary")}
                                    className="flex-1 py-4 bg-white/90 text-gray-700 font-semibold rounded-2xl shadow
                                    hover:bg-[#f1ffe0] hover:text-[#3d5919] transition-colors duration-200
                                    relative flex flex-col items-center justify-center gap-4">
                                    <img
                                        src={voca}
                                        alt="vocabulary"
                                        className="w-[120px]"
                                    />
                                    <div className="text-2xl font-bold text-center">
                                        연령 맞춤별<br/>어휘력 테스트
                                    </div>
                                    <div className="text-lg leading-tight">
                                        내 어휘력은<br/>얼마나 될까?
                                    </div>
                                    <div className="relative top-5 px-7 py-1 text-xl bg-[#3d5919] text-white rounded-2xl">
                                        확인해보기
                                    </div>
                                    <img
                                        src="https://media.tenor.com/zF7UE_HdlqEAAAAi/bird.gif"
                                        alt="bird"
                                        className="w-[75px] absolute bottom-[500px] right-[-30px] -z-10"
                                    />
                                </button>
                            </div>
                        </>
                    ) : selectedTest === "reading" ? (
                        <ReadingTest />
                    ) : (
                        <VocabularyTest />
                    )}
                </div>
            </div>
        </>
    );
}