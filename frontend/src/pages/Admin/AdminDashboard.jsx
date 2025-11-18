import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from "recharts";
import useCheckUser from "@/hooks/useCheckUser.jsx";

const COLORS = ["#4E944F", "#82ca9d", "#ffc658", "#8884d8", "#FF6B6B"];

export default function AdminDashboard() {
  const [users, setUsers] = useState({ new_users: [], banned_users: [] });
  const [subs, setSubs] = useState({ daily: {}, plan_totals: [] });
  const [learning, setLearning] = useState({});
  const [contents, setContents] = useState([]);
  const [support, setSupport] = useState({ by_category: [], by_status: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          userRes, subRes, learnRes, contentRes, supportRes
        ] = await Promise.all([
          axiosInstance.get("/admin/dashboard/users/chart"),
          axiosInstance.get("/admin/dashboard/subscriptions/chart"),
          axiosInstance.get("/admin/dashboard/learning/chart"),
          axiosInstance.get("/admin/dashboard/contents/chart"),
          axiosInstance.get("/admin/dashboard/support/chart"),
        ]);
        setUsers(userRes.data);
        setSubs(subRes.data);
        setLearning(learnRes.data);
        setContents(Object.entries(contentRes.data).map(([date, vals]) => ({
          date,
          writing_count: vals.writing_count || 0,
          reading_count: vals.reading_count || 0,
          avg_mood: vals.avg_mood || 0,
        })));
        setSupport(supportRes.data);
      } catch (err) {
        console.error("대시보드 컨텐츠 로딩 실패", err);
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

  // 데이터 병합
  const userChartData = (() => {
    const merged = {};
    users.new_users.forEach(d => merged[d.date] = { date: d.date, new_users: d.count });
    users.banned_users.forEach(d => {
      merged[d.date] = { ...(merged[d.date] || { date: d.date }), banned_users: d.count };
    });
    return Object.values(merged);
  })();

  const subsChartData = Object.entries(subs.daily).map(([date, plans]) => ({
    date,
    ...Object.fromEntries(Object.entries(plans).map(([plan, vals]) => [plan, vals.revenue])),
  }));

  const learningChartData = Object.entries(learning.tests || {}).map(([date, tests]) => ({
    date,
    ...Object.fromEntries(Object.entries(tests).map(([type, v]) => [type, v.avg_score])),
  }));

  // ──────────────────────────────
  // 컴팩트 레이아웃
  // ──────────────────────────────
  return (
    <div className="p-6 bg-[#F0FDF4] min-h-screen">
      <h1 className="text-2xl font-bold text-green-900 mb-4">
         관리자 대시보드 (최근 한 달 기준)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 유저 */}
        <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
          <h2 className="text-lg font-semibold text-green-800 mb-2"> 신규 유저 / 밴 추이</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={userChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new_users" stroke="#4E944F" name="신규 유저" />
              <Line type="monotone" dataKey="banned_users" stroke="#FF6B6B" name="차단 유저" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 구독 매출 */}
        <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
          <h2 className="text-lg font-semibold text-green-800 mb-2"> 플랜별 매출 추이</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={subsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {subsChartData.length > 0 &&
                Object.keys(subsChartData[0])
                  .filter((k) => k !== "date")
                  .map((key, idx) => (
                    <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
                  ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 학습 활동 */}
        <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
          <h2 className="text-lg font-semibold text-green-800 mb-2"> 테스트 평균 점수</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={learningChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {learningChartData.length > 0 &&
                Object.keys(learningChartData[0])
                  .filter((k) => k !== "date")
                  .map((key, idx) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} />
                  ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/*  콘텐츠 */}
        <div className="bg-white p-4 rounded-xl shadow-md h-[350px]">
          <h2 className="text-lg font-semibold text-green-800 mb-2">콘텐츠 작성 및 기분</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={contents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="writing_count" fill="#4E944F" name="글쓰기 수" />
              <Bar dataKey="reading_count" fill="#82ca9d" name="독서록 수" />
              <Bar dataKey="avg_mood" fill="#ffc658" name="평균 기분 점수" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 고객센터 */}
        <div className="bg-white p-4 rounded-xl shadow-md h-[350px] lg:col-span-2">
          <h2 className="text-lg font-semibold text-green-800 mb-2">고객센터 문의 분포</h2>
          <div className="flex flex-wrap justify-around">
            <ResponsiveContainer width="45%" height={300}>
              <PieChart>
                <Pie data={support.by_category} dataKey="count" nameKey="category" outerRadius={90}>
                  {support.by_category.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="45%" height={300}>
              <PieChart>
                <Pie data={support.by_status} dataKey="count" nameKey="status" outerRadius={90}>
                  {support.by_status.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
