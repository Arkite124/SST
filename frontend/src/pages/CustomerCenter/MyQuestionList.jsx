import React, {useEffect, useState} from 'react';
import axiosInstance from "@/utils/axiosInstance.js";
import {Link} from "react-router-dom";
import {useModal} from "@/contexts/ModalContext.jsx";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";

const categoryStyles = {
    payment_error: "bg-red-500",
    report_user: "bg-orange-600",
    service_question: "bg-blue-500",
    bug_report: "bg-purple-500",
    etc: "bg-gray-500",
};

const categoryLabels = {
    payment_error: "결제 오류",
    report_user: "유저 신고",
    service_question: "서비스 문제",
    bug_report: "버그 제보",
    etc: "기타",
};
function CategoryBadge({ category }) {
    const key = category in categoryStyles ? category : "etc";

    return (
        <span
            className={`
                inline-block 
                px-2 py-0.5 
                text-[11px] 
                text-white 
                font-semibold 
                rounded-full 
                ${categoryStyles[key]}
            `}
        >
            {categoryLabels[key]}
        </span>
    );
}

// 내 문의 내역들 보는 곳
const MyQuestionList = () => {
    const [questions, setQuestions] = useState([]);
    const [page, setPage] = useState(1);
    const [size] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const {alert}=useModal();
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                await axiosInstance.get(`/customer-support/my-posts?page=${page}&size=${size}`).then(res => {
                    setLoading(true)
                    setQuestions(res.data.items || []);
                    setTotalCount(res.data.total);
                    return res.data;
                })
            }catch {
                alert("서버 오류","일시적인 서버 장애가 발생했습니다.")
            }
            finally {
                setLoading(false);
            }
        }
        fetchQuestions();
    },[page])
    const totalPages = Math.ceil(totalCount / size);
    const statusStyles = {
        open: "bg-green-500",
        in_progress: "bg-orange-500",
        closed: "bg-gray-500",
    };

    const statusLabels = {
        open: "접수됨",
        in_progress: "검토중",
        closed: "완료됨",
    };
    function StatusBadge({ status }) {
        const key = status in statusStyles ? status : "closed";
        return (
            <span
                className={`
                inline-block 
                px-2 py-0.5 
                text-[11px] 
                text-white 
                font-semibold 
                rounded-full 
                ${statusStyles[key]}
            `}
            >
            {statusLabels[key]}
        </span>
        );
    }
    return (
        <div className="max-w-3xl mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">내 문의 목록</h1>
            {loading && (
                <LoadingSpinner/>
            )}
            {questions.length > 0 ? (
                <div className="space-y-4">
                    {questions.map((q) => {
                        return (
                            <Link
                                key={q.id}
                                to={`/support/${q.id}`}
                                className={`
                                    block border rounded-lg p-5 shadow-sm transition-all 
                                    duration-200 hover:shadow-md hover:scale-[1.01]
                                `}
                            >
                                {/* 제목 */}
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {q.title}
                                </h2>

                                {/* 카테고리 & 상태 */}
                                <div className="mt-2 flex items-center gap-3 text-sm">
                                    {/* 카테고리 태그 */}
                                    <CategoryBadge category={q.category} />
                                    {/* 상태 배지 */}
                                    <StatusBadge status={q.status} />
                                </div>

                                {/* 날짜 */}
                                <p className="text-xs text-gray-500 mt-3">
                                    {new Date(q.created_at).toLocaleString()}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-600 text-center font-juache">문의 내역이 없습니다.</p>
            )}
            <div className="flex justify-center items-center mt-8 space-x-2">
                {/* 이전 버튼 (1페이지가 아니라면 표시) */}
                {page > 1 && (
                    <button
                        className="px-3 py-1 rounded border bg-white hover:bg-green-100 border-green-300"
                        onClick={() => setPage(page - 1)}
                    >
                        이전
                    </button>
                )}

                {/* 페이지 번호 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 rounded border ${
                            page === p
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white hover:bg-green-100 border-green-300"
                        }`}
                    >
                        {p}
                    </button>
                ))}

                {/* 다음 버튼 (마지막 페이지가 아니라면 표시) */}
                {page < totalPages && (
                    <button
                        className="px-3 py-1 rounded border bg-white hover:bg-green-100 border-green-300"
                        onClick={() => setPage(page + 1)}
                    >
                        다음
                    </button>
                )}
            </div>
        </div>
    );
};

export default MyQuestionList;