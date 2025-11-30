import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";
import { useModal } from "@/contexts/ModalContext.jsx";

import {
    fetchFAQList,
    setPage,
} from "@/redux/slices/supportSlice";

const CustomerCenter = () => {
    const dispatch = useDispatch();
    const { alert } = useModal();

    // Redux 상태 가져오기
    const {
        faqList,
        page,
        size,
        loading,
    } = useSelector((state) => state.support);

    // 아코디언 open ID
    const [openId, setOpenId] = useState(null);

    const toggle = (id) => {
        setOpenId(openId === id ? null : id);
    };

    // FAQ 데이터 로딩
    useEffect(() => {
        dispatch(fetchFAQList({ page, size }))
            .unwrap()
            .catch(() => {
                alert("서버 오류", "FAQ 정보를 불러오는 중 문제가 발생했습니다.");
            });
    }, [page, size]);

    const totalCount = faqList?.total_count || 0;
    const items = faqList?.items || [];
    const totalPages = Math.ceil(totalCount / size);

    return (
        <div className="max-w-2xl mx-auto mt-10 px-4">
            <h1 className="text-3xl font-bold text-green-700 mb-6">
                자주 묻는 질문
            </h1>

            {loading && <LoadingSpinner />}

            <div className="space-y-4">
                {items.map((q) => (
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
                {/* 이전 */}
                {page > 1 && (
                    <button
                        className="px-3 py-1 rounded border bg-white hover:bg-green-100 border-green-300"
                        onClick={() => dispatch(setPage(page - 1))}
                    >
                        이전
                    </button>
                )}

                {/* 페이지 번호 */}
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

                {/* 다음 */}
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

export default CustomerCenter;
