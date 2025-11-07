import { useState } from "react";
import ReadingTest from "@/pages/Tests/ReadingTest/ReadingTest";
import VocabularyTest from "@/pages/Tests/VocabularyTest/VocabularyTestPage";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

export default function TestsPage() {
    const [selectedTest, setSelectedTest] = useState(null);
    useAuthLoad();

    return (
        <div className="flex flex-col items-center w-full p-10">
            {!selectedTest ? (
                <>
                    <h1 className="text-3xl font-bold mb-8">테스트 선택</h1>
                    <div className="flex gap-6">
                        <button
                            onClick={() => setSelectedTest("reading")}
                            className="flex-1 py-4 bg-[#DAE2B6] text-[#626F47] font-semibold rounded-lg shadow hover:bg-[#BBC863] transition-colors duration-200"
                        >
                            문해력 테스트
                        </button>
                        <button
                            onClick={() => setSelectedTest("vocabulary")}
                            className="flex-1 py-4 bg-[#DAE2B6] text-[#626F47] font-semibold rounded-lg shadow hover:bg-[#BBC863] transition-colors duration-200"
                        >
                            어휘력 테스트
                        </button>
                    </div>
                </>
            ) : selectedTest === "reading" ? (
                <ReadingTest />
            ) : (
                <VocabularyTest />
            )}
        </div>
    );
}