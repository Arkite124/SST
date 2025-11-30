import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    adminFetchPosts,
    adminUpdateStatus,
    setPage } from "@/redux/slices/supportAdminSlice";
import { useModal } from "@/contexts/ModalContext";
import { Link } from "react-router-dom";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const AdminQuestionList = () => {
    const dispatch = useDispatch();
    const { alert } = useModal();

    const { posts, page, size, loading } = useSelector(
        (state) => state.supportAdmin
    );

    // ⭐ 정렬 옵션 기본값 oldest (오래된 순)
    const [sort, setSort] = useState("unanswered");

    useEffect(() => {
        dispatch(
            adminFetchPosts({ page, size, sort }) // 🔥 sort 포함
        )
            .unwrap()
            .catch(() => {
                alert("오류", "목록을 불러오지 못했습니다.");
            });
    }, [page, sort]);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-5xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">관리자 문의 목록</h1>

            {/* ⭐ 정렬 옵션 */}
            <div className="flex justify-end mb-3">
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="border p-2 rounded text-sm"
                >
                    <option value="unanswered">접수됨(OPEN) 우선</option>  {/* ⭐ 기본 */}
                    <option value="oldest">오래된 순</option>
                    <option value="latest">최신 순</option>
                    <option value="answered">답변 완료 우선</option>
                </select>
            </div>

            {/* 목록 */}
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                <tr>
                    <th className="p-2 border">ID</th>
                    <th className="p-2 border">제목</th>
                    <th className="p-2 border">카테고리</th>
                    <th className="p-2 border">상태</th>
                    <th className="p-2 border">작성자</th>
                    <th className="p-2 border">작성일</th>
                </tr>
                </thead>

                <tbody>
                {posts.items?.map((p) => (
                    <tr key={p.id} className="text-center hover:bg-gray-50">
                        <td className="p-2 border">{p.id}</td>
                        <td className="p-2 border">
                            <Link
                                to={`/admin/support/${p.id}`}
                                className="text-blue-600 underline"
                            >
                                {p.title}
                            </Link>
                        </td>
                        <td className="p-2 border">{p.category}</td>
                        <td className="p-2 border">{p.status}</td>
                        <td className="p-2 border">{p.user_id}</td>
                        <td className="p-2 border">
                            {new Date(p.created_at).toLocaleString()}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* 페이지네이션 */}
            <div className="flex space-x-2 mt-4 justify-center">
                <button
                    disabled={page <= 1}
                    onClick={() => dispatch(setPage(page - 1))}
                    className="px-3 py-1 border rounded"
                >
                    이전
                </button>

                <button
                    onClick={() => dispatch(setPage(page + 1))}
                    className="px-3 py-1 border rounded"
                >
                    다음
                </button>
            </div>
        </div>
    );
};

export default AdminQuestionList;
