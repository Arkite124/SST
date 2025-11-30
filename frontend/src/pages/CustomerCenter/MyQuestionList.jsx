import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useModal } from "@/contexts/ModalContext.jsx";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";
import {
    fetchMyPosts,
    setPage,
} from "@/redux/slices/supportSlice";
import useCheckUser from "@/hooks/useCheckUser.jsx";

const categoryStyles =
    { payment_error: "bg-red-500",
    report_user: "bg-orange-600",
    service_question: "bg-blue-500",
    bug_report: "bg-purple-500",
    etc: "bg-gray-500", };
const categoryLabels = { payment_error: "결제 오류",
    report_user: "유저 신고",
    service_question: "서비스 문제",
    bug_report: "버그 제보",
    etc: "기타", };
const statusStyles = {
    open: "bg-green-500",
    in_progress: "bg-orange-500",
    closed: "bg-gray-500", };
const statusLabels = {
    open: "접수됨",
    in_progress: "검토중",
    closed: "완료됨", };
export function StatusBadge({ status }) {
    const key = status in statusStyles ? status : "closed";
    return ( <span className={ `inline-block px-2 py-0.5 text-[11px] text-white font-semibold rounded-full ${statusStyles[key]}` } >
        {statusLabels[key]} </span> ); }
export function CategoryBadge({ category }) {
    const key = category in categoryStyles ? category : "etc";
    return ( <span className={ `inline-block px-2 py-0.5 text-[11px] text-white font-semibold rounded-full ${categoryStyles[key]}` } >
        {categoryLabels[key]} </span> ); }

const MyQuestionList = () => {
    const dispatch = useDispatch();
    const { alert } = useModal();
    const {
        myPosts,
        page,
        size,
        loading,
    } = useSelector((state) => state.support);
    const questions = myPosts.items || [];
    const totalCount = myPosts.total || 0;
    const totalPages = Math.ceil(totalCount / size);
    useEffect(() => {
        dispatch(fetchMyPosts({ page, size }))
            .unwrap()
            .catch(() => {
                alert("서버 오류", "일시적인 서버 장애가 발생했습니다.");
            });
    }, [page,size]);
    useCheckUser();
    return (
        <div className="max-w-3xl mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">내 문의 목록</h1>

            {loading && <LoadingSpinner />}

            {/* 목록 */}
            {questions.length > 0 ? (
                <div className="space-y-4">
                    {questions.map((q) => (
                        <Link
                            key={q.id}
                            to={`/support/my/${q.id}`}
                            className="block border rounded-lg p-5 shadow-sm transition-all
              duration-200 hover:shadow-md hover:scale-[1.01]"
                        >
                            <h2 className="text-lg font-semibold text-gray-800">
                                {q.title}
                            </h2>

                            <div className="mt-2 flex items-center gap-3 text-sm">
                                <CategoryBadge category={q.category} />
                                <StatusBadge status={q.status} />
                            </div>

                            <p className="text-xs text-gray-500 mt-3">
                                {new Date(q.created_at).toLocaleString()}
                            </p>
                        </Link>
                    ))}
                </div>
            ) : (
                !loading && (
                    <p className="text-gray-600 text-center font-juache">
                        문의 내역이 없습니다.
                    </p>
                )
            )}

            {/* 페이지네이션 */}
            <div className="flex justify-center items-center mt-8 space-x-2">
                {page > 1 && (
                    <button
                        className="px-3 py-1 rounded border bg-white hover:bg-green-100 border-green-300"
                        onClick={() => dispatch(setPage(page - 1))}
                    >
                        이전
                    </button>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => dispatch(setPage(p))}
                        className={`px-3 py-1 rounded border ${
                            page === p
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white hover:bg-green-100 border-green-300"
                        }`}
                    >
                        {p}
                    </button>
                ))}

                {page < totalPages && (
                    <button
                        className="px-3 py-1 rounded border bg-white hover:bg-green-100 border-green-300"
                        onClick={() => dispatch(setPage(page + 1))}
                    >
                        다음
                    </button>
                )}
            </div>
        </div>
    );
};

export default MyQuestionList;
