import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import StatCard from "@/components/dashboard/StatCard";
import {FaBookOpen, FaBrain, FaSmile, FaPencilAlt, FaGamepad, FaCheckCircle, FaUserShield} from "react-icons/fa";
import {useNavigate} from "react-router-dom";

export default function ChildDashboard() {
    const [profile, setProfile] = useState(null);
    const [writing, setWriting] = useState({});
    const [reading, setReading] = useState({});
    const [wordUsage, setWordUsage] = useState([]);
    const [games, setGames] = useState({});
    const [tests, setTests] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleParentLogin = () => {
        // ✅ 부모 로그인 페이지로 이동
        navigate("/parent/login");
    };
    useEffect(() => {
        async function fetchDashboard() {
            try {
                const [
                    profileRes,
                    writingRes,
                    readingRes,
                    wordUsageRes,
                    gamesRes,
                    testsRes,
                ] = await Promise.all([
                    axiosInstance.get("/child/dashboard/profile"),
                    axiosInstance.get("/child/dashboard/writing"),
                    axiosInstance.get("/child/dashboard/reading"),
                    axiosInstance.get("/child/dashboard/word-usage"),
                    axiosInstance.get("/child/dashboard/games"),
                    axiosInstance.get("/child/dashboard/tests"),
                ]);

                setProfile(profileRes.data);
                setWriting(writingRes.data);
                setReading(readingRes.data);
                setWordUsage(wordUsageRes.data.top_words || []);
                setGames(gamesRes.data.avg_scores || {});
                setTests(testsRes.data.avg_scores || {});
            } catch (err) {
                console.error("❌ 대시보드 데이터 로드 실패:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[80vh] flex items-center justify-center text-gray-500">
                불러오는 중...
            </div>
        );
    }

    if (!profile) return <p>데이터가 없습니다.</p>;

    return (
        <div className="p-8 bg-[#F0FDF4] min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-900">
                    아이 {profile.nickname}의 최근 한 달 활동 요약
                </h1>
                <button
                    onClick={handleParentLogin}
                    className="p-2 rounded-full hover:bg-green-100 text-green-700 transition"
                    title="부모 로그인"
                >
                    <FaUserShield size={22} />
                </button>
            </div>
            {/* 유저 프로필 */}
            <div className="bg-white rounded-2xl p-6 shadow-md w-full flex items-center gap-6 mb-10">
                <img
                    src={profile.profile_img_url || "/default-profile.png"}
                    alt="프로필 이미지"
                    className="w-[5.5rem] h-[5.5rem]  rounded-full border-4 border-green-200 object-cover"
                />
                <div className={"w-full"}>
                    <h2 className="text-2xl font-bold text-green-800">{profile.nickname}</h2>
                    <p className="text-gray-700 mt-1">Lv.{profile.vocabulary_age}</p>
                    <div className={"w-[43rem] flex justify-between items-center"}>
                    <div className="w-[40rem] bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner flex font-logo">
                        <div
                            className="bg-gradient-to-r w-[40rem] from-green-400 to-green-600 h-6 transition-all duration-700 ease-in-out"
                            style={{
                                width: `${Math.min((profile.exp/(profile.vocabulary_age*10)))}%`,
                            }}
                        ></div>
                    </div>
                        {Math.min((profile.exp / (profile.vocabulary_age * 10)))}%</div>
                </div>
            </div>

            {/* 통계 카드 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <StatCard
                    title="생활 글쓰기"
                    value={`${writing.diary_count || 0}회`}
                    description={`평균 기분: ${writing.avg_mood ?? 0}점`}
                    icon={<FaPencilAlt className="text-green-700" />}
                />

                <StatCard
                    title="독서 활동"
                    value={`${reading.reading_count || 0}권`}
                    description="한 달 동안 작성된 독서록"
                    icon={<FaBookOpen className="text-green-700" />}
                />

                <StatCard
                    title="사용 어휘 TOP 1"
                    value={wordUsage.length > 0 ? wordUsage[0].word : "데이터 없음"}
                    description={wordUsage.length > 0 ? `${wordUsage[0].count}회 사용` : ""}
                    icon={<FaBrain className="text-green-700" />}
                />

                <StatCard
                    title="게임 평균 점수"
                    value={
                        Object.keys(games).length > 0
                            ? Math.round(
                                Object.values(games).reduce((a, b) => a + b, 0) / Object.keys(games).length
                            )
                            : 0
                    }
                    description={`${Object.keys(games).length}개 게임 평균`}
                    icon={<FaGamepad className="text-green-700" />}
                />

                <StatCard
                    title="테스트 평균 점수"
                    value={
                        Object.keys(tests).length > 0
                            ? Math.round(
                                Object.values(tests).reduce((a, b) => a + b, 0) / Object.keys(tests).length
                            )
                            : 0
                    }
                    description={`${Object.keys(tests).length}종 테스트`}
                    icon={<FaCheckCircle className="text-green-700" />}
                />

                <StatCard
                    title="기분 평균 점수"
                    value={writing.avg_mood ?? 0}
                    description="한 달간 기록된 기분 평균"
                    icon={<FaSmile className="text-green-700" />}
                />
            </div>

            {/* 어휘 사용 리스트 */}
            <div className="bg-white rounded-2xl mt-10 p-6 shadow-md">
                <h2 className="text-xl font-bold text-green-800 mb-4">💬 자주 사용한 어휘 (최근 한 달)</h2>
                {wordUsage.length > 0 ? (
                    <ul className="space-y-2 text-gray-700">
                        {wordUsage.map((w, idx) => (
                            <li key={idx}>
                                {idx + 1}. <span className="font-semibold">{w.word}</span> — {w.count}회
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">최근 한 달 동안의 어휘 데이터가 없습니다.</p>
                )}
            </div>
        </div>
    );
}