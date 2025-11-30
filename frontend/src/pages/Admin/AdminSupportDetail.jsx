import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    adminFetchPostDetail,
    adminUpdateStatus,
    adminCreateComment,
    adminDeleteComment,
    resetDetail } from "@/redux/slices/supportAdminSlice";
import { useParams } from "react-router-dom";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useModal } from "@/contexts/ModalContext";

const STATUS_LABEL = {
    open: "접수됨",
    in_progress: "처리중",
    resolved: "답변완료",
    closed: "종료됨",
};

const NEXT_STATUS = {
    open: "in_progress",
    in_progress: "resolved",
    resolved: "closed",
    closed: null,
};

const AdminSupportDetail = () => {
    const { postId } = useParams();
    const dispatch = useDispatch();
    const { alert, confirm } = useModal();

    const { postDetail, loading } = useSelector((state) => state.supportAdmin);

    const [comment, setComment] = useState("");

    useEffect(() => {
        dispatch(adminFetchPostDetail(postId));
        return () => dispatch(resetDetail());
    }, [postId]);

    if (loading || !postDetail) return <LoadingSpinner />;

    const { post, comments } = postDetail;

    // 🔥 상태 변경 버튼
    const handleStatusChange = async () => {
        const next = NEXT_STATUS[post.status];
        if (!next) {
            alert("상태 변경 불가", "더 이상 진행할 상태가 없습니다.");
            return;
        }

        await dispatch(adminUpdateStatus({ postId, status: next }))
            .unwrap()
            .then(() => confirm("상태 변경 완료", `상태가 '${STATUS_LABEL[next]}' 로 변경되었습니다.`))
            .catch(() => alert("오류", "상태 변경 실패"));

        dispatch(adminFetchPostDetail(postId));
    };

    // 🔥 댓글 작성
    const handleSubmitComment = async () => {
        if (!comment.trim()) return;

        await dispatch(adminCreateComment({ postId, content: comment }))
            .unwrap()
            .then(() => setComment(""))
            .catch(() => alert("오류", "댓글 작성 실패"));

        dispatch(adminFetchPostDetail(postId));
    };

    // 🔥 댓글 삭제
    const handleDeleteComment = async (commentId) => {
        await dispatch(adminDeleteComment(commentId))
            .unwrap()
            .catch(() => alert("오류", "댓글 삭제 실패"));
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">문의 상세 관리</h1>

            {/* 🔸 게시글 정보 */}
            <div className="border rounded-lg p-4 bg-white shadow">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold">{post.title}</h2>

                    <span className="px-2 py-1 text-sm text-white rounded bg-green-600">
            {STATUS_LABEL[post.status]}
          </span>
                </div>

                <p className="text-gray-500 text-sm mb-2">
                    작성일: {new Date(post.created_at).toLocaleString()}
                </p>

                <div className="text-sm mb-4">
                    <span className="font-semibold text-gray-600">카테고리: </span>
                    <span>{post.category}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded text-sm leading-6 whitespace-pre-line">
                    {post.content}
                </div>

                {/* 상태 변경 버튼 */}
                {NEXT_STATUS[post.status] && (
                    <button
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                        onClick={handleStatusChange}
                    >
                        상태를 '{STATUS_LABEL[NEXT_STATUS[post.status]]}' 로 변경하기
                    </button>
                )}
            </div>

            {/* 🔸 댓글 작성 */}
            <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">관리자 답변 작성</h3>

                <textarea
                    className="w-full border rounded p-3 h-32"
                    placeholder="답변 내용을 입력하세요..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <button
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    onClick={handleSubmitComment}
                >
                    답변 등록
                </button>
            </div>

            {/* 🔸 댓글 목록 */}
            <div className="mt-8">
                <h3 className="text-lg font-bold mb-3">관리자 답변 내역</h3>

                {comments.length === 0 ? (
                    <p className="text-gray-500">등록된 답변이 없습니다.</p>
                ) : (
                    <div className="space-y-4">
                        {comments.map((c) => (
                            <div key={c.id} className="border rounded p-4 bg-white shadow">
                                <div className="text-sm text-gray-500 mb-1">
                                    {new Date(c.created_at).toLocaleString()}
                                </div>
                                <div className="text-sm whitespace-pre-line">{c.content}</div>

                                <button
                                    className="mt-2 text-red-500 text-xs underline"
                                    onClick={() => handleDeleteComment(c.id)}
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupportDetail;
