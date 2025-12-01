import React, { useEffect, useState } from "react";
import { CategoryBadge, StatusBadge } from "@/pages/CustomerCenter/MyQuestionList.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";
import { useModal } from "@/contexts/ModalContext.jsx";
import {
    fetchSupportPostDetail,
    createSupportComment,
    setCommentContent,
    setReplyId,
    resetCommentForm,
} from "@/redux/slices/supportSlice";
import useCheckUser from "@/hooks/useCheckUser.jsx";


// -------------------------------------------------------
// 🔹 댓글 입력 컴포넌트 — Redux 버전
// -------------------------------------------------------
function CommentInput({ postId, replyId = null, onSuccess }) {
    const dispatch = useDispatch();
    const { alert } = useModal();
    const { loading } = useSelector((state) => state.support);

    const [localContent, setLocalContent] = useState("");

    const handleSubmit = async () => {
        if (!localContent.trim()) return;

        try {
            await dispatch(
                createSupportComment({
                    post_id: postId,
                    reply_id: replyId,
                    content: localContent,
                })
            ).unwrap();
            setLocalContent("");   // ← 로컬값 초기화
            setCommentContent("")
            resetCommentForm();
            if (onSuccess) onSuccess();
        } catch (err) {
            alert("오류", err?.detail || "댓글 작성 실패");
        }
    };

    return (
        <div className="mt-2">
            <textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                className="w-full border rounded p-2 text-sm h-24 resize-none"
                placeholder={replyId ? "답글을 입력하세요..." : "답변을 입력하세요..."}
                rows={replyId ? 2 : 3}
            />

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
            >
                {loading ? "등록중..." : "등록"}
            </button>
        </div>
    );
}
// -------------------------------------------------------
// 🔹 댓글 단일 아이템 — 재귀 구조 그대로 유지
// -------------------------------------------------------
function CommentItem({ comment, postId, refresh, user, status }) {
    const [showReply, setShowReply] = useState(false);
    const canReply =
        status === "resolved" || status === "closed" || user?.role === "admin";
    return (
        <div className="border-b py-2 pl-2">
            {/* 작성자 */}
            <div className="text-sm flex items-center space-x-2">
                <span className="font-semibold">{comment.user.nickname}</span>
                <span className="text-gray-400 text-xs">
          {new Date(comment.created_at).toLocaleString()}
        </span>
            </div>

            {/* 내용 */}
            <div className="text-sm mt-1">{comment.content}</div>

            {/* 답글 기능 */}
            {canReply && comment.reply_id === null && (
                <button
                    onClick={() => setShowReply(!showReply)}
                    className="text-xs text-blue-500 mt-1"
                >
                    답글쓰기
                </button>
            )}

            {showReply && (
                <CommentInput
                    postId={postId}
                    replyId={comment.id}
                    onSuccess={() => {
                        setShowReply(false);
                        refresh();
                    }}
                />
            )}

            {/* 재귀 렌더링 */}
            <div className="ml-4">
                {comment.replies?.map((child) => (
                    <CommentItem
                        key={child.id}
                        comment={child}
                        postId={postId}
                        refresh={refresh}
                        user={user}
                        status={status}
                    />
                ))}
            </div>
        </div>
    );
}



// -------------------------------------------------------
// 🔹 문의글 상세 페이지 (Redux 버전)
// -------------------------------------------------------
const MyQuestionDetail = () => {
    const { postId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { alert } = useModal();
    useCheckUser();
    const { user } = useSelector((state) => state.auth);
    const { postDetail, loading, error } = useSelector(
        (state) => state.support
    );

    // 상세 정보 가져오기
    const loadDetail = () => {
        dispatch(fetchSupportPostDetail(postId)).unwrap().catch(() => {
            alert("오류", "문의글 정보를 불러오지 못했습니다.");
        });
    };

    useEffect(() => {
        loadDetail();
    }, [postId]);

    if (loading || !postDetail) return <LoadingSpinner />;
    if (error)
        return <p className="p-4 text-red-500">불러오는 중 오류가 발생했습니다.</p>;

    const data = postDetail;

    const isCustomer = user?.role === "customer";
    const canWriteComment =
        data.status === "resolved" ||
        data.status === "closed" ||
        user?.role === "admin";

    return (
        <div className="p-4">
            {/* 제목 + 상태 */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">{data.title}</h2>

                <div className="flex items-center space-x-2">
                    <CategoryBadge category={data.category} />
                    <StatusBadge status={data.status} />
                </div>
            </div>

            {/* 작성일 */}
            <p className="text-xs text-gray-400 mb-4">
                작성일: {new Date(data.created_at).toLocaleString()}
            </p>

            {/* 본문 */}
            <div className="border p-3 rounded bg-white text-sm leading-6">
                {data.content}
            </div>

            {/* 수정 버튼 — 상태가 open 일 때만 */}
            {data.status === "open" && (
                <button
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold"
                    onClick={() => navigate(`/support/${postId}/edit`)}
                >
                    수정하기
                </button>
            )}

            {/* 댓글 입력 */}
            {canWriteComment ? (
                <CommentInput postId={Number(postId)} onSuccess={loadDetail} />
            ) : (
                isCustomer && (
                    <p className="text-xs text-gray-500 mt-2 font-juache">
                        ※ 관리자 답변이 완료된 후에만 댓글을 작성할 수 있습니다.
                    </p>
                )
            )}

            {/*/!* 댓글 목록 *!/*/}
            <div className="mt-4">
                {data.comments.length === 0 ? (
                    <p className="text-sm text-green-500 font-juache">답글이 없습니다.</p>
                ) : (
                    data.comments.map((c) => (
                        <CommentItem
                            key={c.id}
                            comment={c}
                            postId={Number(postId)}
                            refresh={loadDetail}
                            user={user}
                            status={data.status}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default MyQuestionDetail;
