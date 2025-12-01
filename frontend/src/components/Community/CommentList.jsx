import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useModal } from "@/contexts/ModalContext.jsx";
import {
    addComment,
    toggleReplies,
    addReply,
    loadComments,
    loadReplies,
    updateComment,
    deleteComment
} from "@/redux/slices/commentSlice.js";

export default function CommentList({ postId, currentUserId }) {
    const dispatch = useDispatch();
    const comments = useSelector(state => state.comment.comments);
    const [newComment, setNewComment] = useState("");
    const { alert } = useModal();

    const userId = Number(currentUserId);

    useEffect(() => {
        const fetchCommentsWithReplies = async () => {
            try {
                // 상위 댓글 불러오기
                const result = await dispatch(loadComments({ postId })).unwrap();

                // hasReplies가 true인 댓글은 대댓글도 미리 로딩
                result.forEach(c => {
                    if (c.hasReplies) {
                        dispatch(loadReplies({ postId, commentId: c.id }));
                    }
                });
            } catch (err) {
                console.error("댓글 로딩 오류:", err);
                alert("오류", "댓글을 불러오지 못했습니다.");
            }
        };

        fetchCommentsWithReplies();
    }, [dispatch, postId, alert]);

    const handleAddComment = () => {
        if (!newComment.trim()) return alert("입력 오류", "댓글 내용을 입력해주세요.");
        dispatch(addComment({ postId, content: newComment }));
        setNewComment("");
    };

    return (
        <div className="mt-3">
            {/* 댓글 작성 UI */}
            <div className="mb-4 flex flex-col gap-1 mx-6">
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        maxLength={500}
                        rows={3}
                        className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                    />
                    <div className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 ${newComment.length >= 500 ? "text-red-500" : "text-gray-500"}`}>
                        {newComment.length} / 500
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleAddComment}
                        className="bg-[#39bf2d] text-white text-[13pt] px-4 py-2 rounded-[11px] w-[90px]"
                    >
                        작성
                    </button>
                </div>
            </div>

            {/* 댓글 리스트 */}
            {comments.length === 0 ? (
                <p className="mx-6">댓글이 없습니다.</p>
            ) : (
                comments.map(c => (
                    <CommentItem
                        key={c.id}
                        comment={c}
                        postId={postId}
                        currentUserId={userId}
                    />
                ))
            )}
        </div>
    );
}

// =========================================================
// CommentItem (댓글 + 대댓글)
// =========================================================
function CommentItem({ comment, postId, currentUserId }) {
    const dispatch = useDispatch();
    const { alert } = useModal();

    const [newReply, setNewReply] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [editReplyContent, setEditReplyContent] = useState("");

    useEffect(() => {
        setEditContent(comment.content);
    }, [comment.content]);

    // 답글 버튼 클릭 시
    const handleToggleReplies = () => {
        dispatch(toggleReplies(comment.id));
        if (comment.replies.length === 0 && comment.hasReplies) {
            dispatch(loadReplies({ postId, commentId: comment.id }));
        }
    };

    const handleAddReply = () => {
        if (!newReply.trim()) return alert("대댓글 내용을 입력해주세요");
        dispatch(addReply({ postId, commentId: comment.id, content: newReply }));
        setNewReply("");
    };

    const handleUpdateComment = () => {
        if (!editContent.trim()) return alert("수정 내용이 비어있습니다.");
        dispatch(updateComment({ commentId: comment.id, content: editContent }));
        setIsEditing(false);
    };

    const handleUpdateReply = (replyId) => {
        if (!editReplyContent.trim()) return alert("수정 내용이 비어있습니다.");
        dispatch(updateComment({ commentId: replyId, content: editReplyContent }));
        setEditingReplyId(null);
        setEditReplyContent("");
    };

    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })} ` +
            `${date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric" }).replace(":", "시 ") + "분"}`;
    };

    return (
        <div className="p-2 rounded border-gray-200 relative">

            {/* 댓글 수정/삭제 버튼 */}
            {Number(currentUserId) === Number(comment.user.id) && (
                <div className="absolute top-2 right-8 flex gap-2">
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="font-bold text-[10pt] px-2 py-1 rounded-md transition-colors duration-200 hover:bg-[#39bf2d] hover:text-white"
                        >
                            수정
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (window.confirm("정말 삭제하시겠습니까?")) {
                                dispatch(deleteComment({commentId: comment.id}));
                            }
                        }}
                        className="text-gray-500 hover:text-red-500 text-[10pt]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                             className="bi bi-trash" viewBox="0 0 16 16">
                            <path
                                d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path
                                d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                    </button>
                </div>
            )}

            {/* 댓글 내용 */}
            <div className="ml-6 mr-6 flex flex-col gap-1">
                <p className="font-extrabold">{comment.user.nickname}</p>
                {isEditing ? (
                    <>
                        <div className="relative">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                            />
                            <div className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 ${editContent.length >= 500 ? "text-red-500" : "text-gray-500"}`}>
                                {editContent.length} / 500
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-2 mb-4">
                            <button onClick={handleUpdateComment} className="bg-[#39bf2d] text-white text-[11pt] px-4 py-2 rounded-[11px] w-[70px]">저장</button>
                            <button onClick={() => setIsEditing(false)} className="bg-gray-300 text-black text-[11pt] px-4 py-2 rounded-[11px] w-[70px]">취소</button>
                        </div>
                    </>
                ) : (
                    <>
                        <p>{comment.content}</p>
                        <p className="text-gray-500 text-[10pt]">
                            작성일: {formatDateTime(comment.created_at)}
                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <> | 수정일: {formatDateTime(comment.updated_at)}</>
                            )}
                        </p>
                        <div className="flex gap-2 mt-2 mb-3">
                            <button
                                onClick={handleToggleReplies}
                                className="bg-[#39bf2d] text-white text-[10pt] px-2 py-1 rounded-[5px] w-[60px]"
                            >
                                답글 {comment.reply_count}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 대댓글 영역 */}
            {comment.showReplies && (
                <div className="mt-2 ml-6 mb-3 mr-6 p-3 bg-white rounded-[5pt] shadow-lg relative">
                    {comment.replies.length === 0 ? (
                        <div className="m-6 text-gray-500 text-center py-2">답글이 없습니다.</div>
                    ) : (
                        comment.replies.map(r => (
                            <div key={r.id} className="mb-2 p-2 border-b border-gray-200 last:border-none flex flex-col gap-1 relative">
                                {r.user && Number(currentUserId) === Number(r.user.id) && (
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {editingReplyId !== r.id && (
                                            <button
                                                onClick={() => { setEditingReplyId(r.id); setEditReplyContent(r.content); }}
                                                className="font-bold text-[10pt] px-2 py-1 rounded-md transition-colors duration-200 hover:bg-[#39bf2d] hover:text-white"
                                            >
                                                수정
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (window.confirm("정말 삭제하시겠습니까?")) {
                                                    dispatch(deleteComment({ commentId: r.id }));
                                                }
                                            }}
                                            className="text-gray-500 hover:text-red-500 text-[10pt]"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                <p className="font-semibold">{r.user.nickname}</p>
                                {editingReplyId === r.id ? (
                                    <>
                                        <div className="relative">
                                            <textarea
                                                value={editReplyContent}
                                                onChange={(e) => setEditReplyContent(e.target.value)}
                                                rows={3}
                                                maxLength={500}
                                                className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                                            />
                                            <div className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 ${editReplyContent.length >= 500 ? "text-red-500" : "text-gray-500"}`}>
                                                {editReplyContent.length} / 500
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end mt-2">
                                            <button onClick={() => handleUpdateReply(r.id)} className="bg-[#39bf2d] text-white text-[11pt] px-4 py-2 rounded-[11px] w-[70px]">저장</button>
                                            <button onClick={() => { setEditingReplyId(null); setEditReplyContent(""); }} className="bg-gray-300 text-black text-[11pt] px-4 py-2 rounded-[11px] w-[70px]">취소</button>
                                        </div>
                                    </>
                                ) : (
                                    <p>{r.content}</p>
                                )}
                            </div>
                        ))
                    )}

                    {/* 대댓글 작성 UI */}
                    <div className="mt-8 flex flex-col gap-1">
                        <div className="relative">
                            <textarea
                                value={newReply}
                                onChange={e => setNewReply(e.target.value)}
                                placeholder="답글을 입력해주세요"
                                maxLength={500}
                                rows={3}
                                className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                            />
                            <div className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 ${newReply.length >= 500 ? "text-red-500" : "text-gray-500"}`}>
                                {newReply.length} / 500
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleAddReply}
                                className="bg-[#39bf2d] text-white text-[11pt] px-4 py-2 rounded-[11px] w-[80px]"
                            >
                                작성
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-center items-center h-0">
                <hr className="border-0 h-[1px] w-[95%] bg-gray-300" />
            </div>
        </div>
    );
}
