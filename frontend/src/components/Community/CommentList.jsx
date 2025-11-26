import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useModal } from "@/contexts/ModalContext.jsx";
import { setComments, addComment, toggleReplies, addReply } from "@/redux/slices/commentSlice.js";

export default function CommentList() {
    const dispatch = useDispatch();
    const comments = useSelector(state => state.comment.comments);
    const [newComment, setNewComment] = useState("");
    const { alert } = useModal();

    // 댓글 불러오기 (더미)
    useEffect(() => {
        const dummyComments = [
            { id: 1, content: "댓글 1", replies: [], showReplies: false },
            { id: 2, content: "댓글 2", replies: [], showReplies: false },
            { id: 3, content: "댓글 3", replies: [], showReplies: false },
        ];
        dispatch(setComments(dummyComments));
    }, [dispatch]);

    const handleAddComment = () => {
        if (!newComment.trim()) return alert("입력 오류", "댓글 내용을 입력해주세요.");
        const comment = {
            id: comments.length + 1,
            content: newComment,
            replies: [],
            showReplies: false,
        };
        dispatch(addComment(comment));
        setNewComment("");
    };

    return (
        <div className="mt-3">
            {/* 댓글 입력 */}
            <div className="mb-4 flex flex-col gap-1">
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        maxLength={500}
                        rows={3}
                        className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                    />
                    <div
                        className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 ${
                            newComment.length >= 500 ? "text-red-500" : "text-gray-500"
                        }`}
                    >
                        {newComment.length} / 500
                    </div>
                </div>
                <div className="flex justify-end">
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
                <p>댓글이 없습니다.</p>
            ) : (
                comments.map((c) => <CommentItem key={c.id} comment={c} />)
            )}
        </div>
    );
}

// 댓글 + 대댓글
function CommentItem({ comment }) {
    const dispatch = useDispatch();

    const handleToggleReplies = () => dispatch(toggleReplies(comment.id));

    const handleAddReply = () => {
        const reply = { id: comment.replies.length + 1, content: "새 대댓글" };
        dispatch(addReply({ commentId: comment.id, reply }));
    };

    return (
        <>
            <div className="p-2 rounded mb-2 border-gray-200">
                <p className="font-extrabold">작성자</p>
                <p>{comment.content}</p>

                <div className="flex gap-2 mt-2">
                    <button
                        onClick={handleToggleReplies}
                        className="bg-[#39bf2d] text-white text-[10pt] px-2 py-1 rounded-[5px] w-[60px]"
                    >
                        답글
                    </button>
                    {comment.showReplies && (
                        <button
                            onClick={handleAddReply}
                            className="bg-[#149607] text-white text-[10pt] px-2 py-1 rounded-[5px] w-[80px]"
                        >
                            새 대댓글
                        </button>
                    )}
                </div>

                {/* 대댓글 박스 */}
                {comment.showReplies && (
                    <div className="mt-2 ml-6 p-3 bg-white rounded-[5pt] shadow-sm">
                        {comment.replies.length === 0 ? (
                            <div>대댓글이 없습니다.</div>
                        ) : (
                            comment.replies.map((r) => (
                                <div
                                    key={r.id}
                                    className="mb-2 p-2 border-b border-gray-200 last:border-none"
                                >
                                    <p className="font-semibold">작성자</p>
                                    <p>{r.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
            <hr/>
        </>
    );
}
