import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from "recharts";

const COLORS = ["#4E944F", "#82ca9d", "#ffc658", "#8884d8"];

export default function ParentDashboard() {
    const [activity, setActivity] = useState({});
    const [tests, setTests] = useState([]);
    const [games, setGames] = useState([]);
    const [mood, setMood] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAll() {
            try {
                const [activityRes, testsRes, gamesRes, moodRes] = await Promise.all([
                    axiosInstance.get("/parent/dashboard/activity/chart", { withCredentials: true }),
                    axiosInstance.get("/parent/dashboard/tests/chart", { withCredentials: true }),
                    axiosInstance.get("/parent/dashboard/games/chart", { withCredentials: true }),
                    axiosInstance.get("/parent/dashboard/mood/chart", { withCredentials: true }),
                ]);
                setActivity(activityRes.data);
                setTests(testsRes.data);
                setGames(gamesRes.data);
                setMood(moodRes.data);
            } catch (err) {
                console.error("부모 대시보드:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    if (loading)
        return (
            <div className="w-full h-[80vh] flex items-center justify-center text-gray-500">
                불러오는 중...
            </div>
        );

    // 📊 활동 데이터 병합
    const activityChartData = (() => {
        const merged = {};
        const datasets = [
            { key: "글쓰기", data: activity.daily_writings || [] },
            { key: "독서", data: activity.reading_logs || [] },
            { key: "테스트", data: activity.tests || [] },
            { key: "게임", data: activity.games || [] },
        ];
        datasets.forEach(({ key, data }) =>
            data.forEach(({ date, count }) => {
                if (!merged[date]) merged[date] = { date };
                merged[date][key] = count;
            })
        );
        return Object.values(merged);
    })();

    return (
        <div className="p-6 bg-[#F0FDF4] min-h-screen">
            <h1 className="text-2xl font-bold text-green-900 mb-4">
                👩‍👧 부모 대시보드 (최근 한 달 기준)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 📅 자녀 활동 추이 */}
                <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
                    <h2 className="text-lg font-semibold text-green-800 mb-2">📅 활동 추이</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={activityChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="글쓰기" stroke="#4E944F" />
                            <Line type="monotone" dataKey="독서" stroke="#82ca9d" />
                            <Line type="monotone" dataKey="테스트" stroke="#ffc658" />
                            <Line type="monotone" dataKey="게임" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 🧠 테스트 평균 */}
                <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
                    <h2 className="text-lg font-semibold text-green-800 mb-2">🧠 테스트 평균 점수</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={tests}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="test_type" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="avg_score" fill="#4E944F" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 🎮 게임 점수 */}
                <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
                    <h2 className="text-lg font-semibold text-green-800 mb-2">🎮 게임 평균 점수</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={games}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="game_type" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avg_score" fill="#82ca9d" name="평균 점수" />
                            <Bar dataKey="count" fill="#ffc658" name="플레이 횟수" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 😊 기분 변화 */}
                <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
                    <h2 className="text-lg font-semibold text-green-800 mb-2">😊 기분 변화</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={mood}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="avg_mood" stroke="#4E944F" name="평균 기분" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 🎯 자녀 요약 */}
            <div className="bg-white p-5 rounded-xl shadow-md mt-6">
                <h2 className="text-lg font-semibold text-green-800 mb-3">🎯 자녀 학습 요약</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="bg-green-50 rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-green-800 font-semibold">총 글쓰기</p>
                        <p className="text-xl font-bold text-green-900">
                            {activity.daily_writings?.reduce((a, b) => a + b.count, 0) || 0}회
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-green-800 font-semibold">총 독서록</p>
                        <p className="text-xl font-bold text-green-900">
                            {activity.reading_logs?.reduce((a, b) => a + b.count, 0) || 0}권
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-green-800 font-semibold">테스트 응시</p>
                        <p className="text-xl font-bold text-green-900">
                            {activity.tests?.reduce((a, b) => a + b.count, 0) || 0}회
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-green-800 font-semibold">게임 플레이</p>
                        <p className="text-xl font-bold text-green-900">
                            {activity.games?.reduce((a, b) => a + b.count, 0) || 0}회
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
