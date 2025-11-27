import React, {useEffect, useState} from 'react';
import axiosInstance from "@/utils/axiosInstance.js";
import {useModal} from "@/contexts/ModalContext.jsx";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";
// 자주 묻는 질문 및 내 문의 내역과 문의 작성으로 연결 되는 관문
const CustomerCenter = () => {
    const [questions, setQuestions] = useState([]);
    const [page, setPage] = useState(1);
    const [size] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [openId, setOpenId] = useState(null);
    const toggle = (id) => {
        setOpenId(openId === id ? null : id);
    };
    const {alert}=useModal();
    useEffect(()=>{
        const question=async ()=>{
            try {
                const res= await axiosInstance.get(`/customer-support/faq?page=${page}&size=${size}`)
                setLoading(true);
                setQuestions(res.data.items||[]);
                setTotalCount(res.data.total_count);
                return res.data;
            }
            catch {
                alert("서버오류","일시적인 서버 오류가 발생했습니다.")
            }
            finally {
                setLoading(false);
            }
        }
        question();
    },[page])
    const totalPages = Math.ceil(totalCount / size);
    return (
        <div className="max-w-2xl mx-auto mt-10 px-4">
            <h1 className="text-3xl font-bold text-green-700 mb-6">
                자주 묻는 질문
            </h1>

            {/* 로딩 중 */}
            {loading && (
                <LoadingSpinner/>
            )}

            {/* FAQ 목록 */}
            <div className="space-y-4">
                {questions.map((q) => (
                    <div
                        key={q.id}
                        className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm"
                    >
                        <button
                            className="w-full flex justify-between items-center text-left"
                            onClick={() => toggle(q.id)}
                        >
                            <h2 className="text-lg font-semibold text-green-800">
                                Q. {q.title}
                            </h2>

                            <span
                                className={`text-green-700 transition-transform ${
                                    openId === q.id ? "rotate-180 text-green-700" : ""
                                }`}
                            >
                                ▼
                            </span>
                        </button>

                        {openId === q.id && (
                            <p className="mt-3 text-gray-700 leading-relaxed font-juache">
                               A. {q.content}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-center items-center mt-8 space-x-2">
                {/* 이전 버튼 */}
                <button
                    className={`px-3 py-1 rounded border ${
                        page === 1
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white hover:bg-green-100 border-green-300"
                    }`}
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    이전
                </button>

                {/* 페이지 번호 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
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
                    )
                )}

                {/* 다음 버튼 */}
                <button
                    className={`px-3 py-1 rounded border ${
                        page === totalPages
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white hover:bg-green-100 border-green-300"
                    }`}
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    다음
                </button>
            </div>
        </div>
    );
}

export default CustomerCenter;