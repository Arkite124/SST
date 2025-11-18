import { useState} from "react";
import { useNavigate } from "react-router-dom";
import { getWordSearchResult } from "@/utils/activities.js"; // ✅ 기존 API 통합
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import {useModal} from "@/contexts/ModalContext.jsx";
import useCheckUser from "@/hooks/useCheckUser.jsx";

export default function WordSearchPage() {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    useAuthLoad()
    useCheckUser();
    const { alert } = useModal();

    // 🔍 단어 검색
    const handleSearch = async () => {
        if (!query.trim()) {
            await alert("안내", "검색어를 입력하세요!");
            return;
        }
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const data = await getWordSearchResult(query);
            setResult(data);
        } catch (err) {
            console.error("❌ 검색 실패:", err);
            if (err.response?.status === 401) {
                alert("로그인이 필요합니다.");
                navigate("/login");
            } else {
                setError("검색 중 오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-[100%] bg-[#E9EFC0] rounded-2xl shadow-inner">
            <h2 className="text-2xl font-normal text-[#4E944F] mb-5 flex items-center font-juache">
                어휘 검색
            </h2>

            {/* 🔎 검색창 */}
            <div className="flex gap-3 mb-3 items-center justify-center">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="단어를 입력하세요"
                    className="border-2 border-[#B4E197] rounded-xl px-4 py-3 w-[80%] text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#83BD75]"
                />
                <Button
                    onClick={handleSearch}
                    disabled={loading}
                    label={loading ? "검색 중..." : "검색"}
                >
                </Button>
            </div>

            {/* ⏳ 로딩 상태 */}
            {loading && (
                <div className="flex justify-center mt-10">
                    <LoadingSpinner />
                </div>
            )}

            {/* ⚠️ 오류 메시지 */}
            {error && (
                <p className="text-red-500 text-center font-semibold mt-5">
                    {error}
                </p>
            )}

            {/* 📘 검색 결과 */}
            {result && (
                <div className="space-y-4">
                    <Card className="p-4 bg-white shadow-md rounded-2xl border border-[#B4E197]">
                        <h3 className="text-lg font-semibold text-[#4E944F] mb-2">
                            📖 검색 결과
                        </h3>

                        {/* 단어명 */}
                        {result?.results.map((result, i) => (
                            <div key={i} className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
                                <p className="text-xl font-bold mb-1">{result.word}</p>
                                {result.origin && <p className="text-gray-500 mb-1">[{result.origin}]</p>}
                                {result.pos && <p className="text-gray-700 mb-1"><strong>품사:</strong> {result.pos}</p>}
                                {result.definition && <p className="text-gray-700 mb-2"><strong>뜻:</strong> {result.definition}</p>}
                                {result.link && (
                                    <a href={result.link} target="_blank" rel="noopener noreferrer"
                                       className="text-blue-500 hover:underline text-sm">자세히 보기 →</a>
                                )}

                                {/* 예문 */}
                                {result.examples?.length > 0 && (
                                    <div className="mt-2">
                                        <p className="font-semibold text-[#4E944F]">📘 예문</p>
                                        <ul className="list-disc list-inside text-gray-600 text-sm">
                                            {result.examples.map((ex, j) => (
                                                <li key={j}>{ex}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 유사어 */}
                                {result.similar_words?.length > 0 && (
                                    <div className="mt-3">
                                        <p className="font-semibold text-[#4E944F]">🔗 유사어</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {result.similar_words.map((word, j) => (
                                                <span key={j} className="bg-[#E9EFC0] px-3 py-1 rounded-full text-sm border border-[#B4E197]">
                                              {word}
                                            </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </Card>
                </div>
            )}
        </div>
    );
}
