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

    // ✅ currentUserId를 숫자로 변환
    const userId = Number(currentUserId);

    // ✅ 콘솔 로그 추가
    console.log("=== CommentList 렌더링 ===");
    console.log("받은 currentUserId:", currentUserId, "타입:", typeof currentUserId);
    console.log("변환된 userId:", userId, "타입:", typeof userId);
    console.log("comments 개수:", comments.length);

    useEffect(() => {
        console.log("=== loadComments 호출 ===");
        console.log("postId:", postId);
        dispatch(loadComments({ postId }));
    }, [dispatch, postId]);

    const handleAddComment = () => {
        console.log("=== 댓글 작성 시도 ===");
        console.log("newComment:", newComment);
        if (!newComment.trim()) return alert("입력 오류", "댓글 내용을 입력해주세요.");
        dispatch(addComment({ postId, content: newComment }));
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
                comments.map((c) => {
                    console.log("=== 댓글 렌더링 ===");
                    console.log("댓글 ID:", c.id);
                    console.log("댓글 작성자:", c.user);
                    return (
                        <CommentItem
                            key={c.id}
                            comment={c}
                            postId={postId}
                            currentUserId={userId}
                        />
                    );
                })
            )}
        </div>
    );
}

function CommentItem({ comment, postId, currentUserId }) {
    const dispatch = useDispatch();
    const [newReply, setNewReply] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const { alert } = useModal();

    const handleToggleReplies = () => {
        console.log("=== 답글 토글 ===");
        console.log("commentId:", comment.id);
        console.log("현재 showReplies:", comment.showReplies);
        console.log("replies 개수:", comment.replies.length);
        console.log("hasReplies:", comment.hasReplies);

        dispatch(toggleReplies(comment.id));
        if (comment.replies.length === 0 && comment.hasReplies) {
            console.log("대댓글 로딩 시작...");
            dispatch(loadReplies({ postId, commentId: comment.id }));
        }
    };

    const handleAddReply = () => {
        console.log("=== 대댓글 작성 시도 ===");
        console.log("postId:", postId, "commentId:", comment.id);
        console.log("content:", newReply);
        if (!newReply.trim()) return alert("대댓글 내용을 입력해주세요");
        dispatch(addReply({ postId, commentId: comment.id, content: newReply }));
        setNewReply("");
    };

    const handleUpdateComment = () => {
        console.log("=== 댓글 수정 시도 ===");
        console.log("commentId:", comment.id, "새 내용:", editContent);
        if (!editContent.trim()) return alert("수정 내용이 비어있습니다.");
        dispatch(updateComment({ commentId: comment.id, content: editContent }));
        setIsEditing(false);
    };

    const handleDeleteComment = () => {
        console.log("=== 댓글 삭제 시도 ===");
        console.log("commentId:", comment.id);
        if (window.confirm("정말 삭제하시겠습니까?")) {
            dispatch(deleteComment({ commentId: comment.id }));
        }
    };

    // ✅ 권한 체크 로그
    console.log("=== CommentItem 권한 체크 ===");
    console.log("댓글 ID:", comment.id);
    console.log("currentUserId:", currentUserId, "타입:", typeof currentUserId);
    console.log("comment.user:", comment.user);
    console.log("comment.user.id:", comment.user?.id, "타입:", typeof comment.user?.id);
    console.log("Number(currentUserId):", Number(currentUserId));
    console.log("Number(comment.user.id):", Number(comment.user?.id));
    console.log("비교 결과:", Number(currentUserId) === Number(comment.user?.id));

    return (
        <div className="p-2 rounded mb-2 border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-extrabold">{comment.user.nickname}</p>
                    <p className="text-gray-500 text-[10pt]">
                        작성일: {new Date(comment.created_at).toLocaleString()}
                        {comment.updated_at && comment.updated_at !== comment.created_at ? (
                            <> | 수정일: {new Date(comment.updated_at).toLocaleString()}</>
                        ) : null}
                    </p>
                </div>
                {/* ✅ Number()로 명시적 변환하여 비교 */}
                {Number(currentUserId) === Number(comment.user.id) && (
                    <div className="flex gap-2">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={() => {
                                        console.log("수정 버튼 클릭");
                                        setIsEditing(true);
                                    }}
                                    className="text-[10pt] text-blue-500 hover:underline"
                                >
                                    수정
                                </button>
                                <button
                                    onClick={handleDeleteComment}
                                    className="text-[10pt] text-red-500 hover:underline"
                                >
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 댓글 내용 또는 편집 모드 */}
            {isEditing ? (
                <div className="mt-2 flex flex-col gap-1">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={handleUpdateComment}
                            className="bg-[#39bf2d] text-white text-[13pt] px-4 py-2 rounded-[11px] w-[90px]"
                        >
                            저장
                        </button>
                        <button
                            onClick={() => {
                                console.log("수정 취소");
                                setIsEditing(false);
                            }}
                            className="bg-gray-300 text-black text-[13pt] px-4 py-2 rounded-[11px] w-[90px]"
                        >
                            취소
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-2">{comment.content}</p>
            )}

            {/* 답글 버튼 */}
            <div className="flex gap-2 mt-2 mb-3">
                <button
                    onClick={handleToggleReplies}
                    className="bg-[#39bf2d] text-white text-[10pt] px-2 py-1 rounded-[5px] w-[60px]"
                >
                    답글
                </button>
            </div>

            {/* 대댓글 영역 */}
            {comment.showReplies && (
                <div className="mt-2 ml-6 p-3 bg-white rounded-[5pt] shadow-sm">
                    {comment.replies.length === 0 ? (
                        <div>대댓글이 없습니다.</div>
                    ) : (
                        comment.replies.map(r => {
                            console.log("=== 대댓글 렌더링 ===");
                            console.log("대댓글 ID:", r.id);
                            console.log("대댓글 작성자:", r.user);
                            console.log("currentUserId:", currentUserId);
                            console.log("r.user.id:", r.user?.id);
                            console.log("대댓글 권한 비교:", Number(currentUserId) === Number(r.user?.id));

                            return (
                                <div key={r.id} className="mb-2 p-2 border-b border-gray-200 last:border-none">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{r.user.nickname}</p>
                                            <p className="text-gray-500 text-[10pt]">
                                                작성일: {new Date(r.created_at).toLocaleString()}
                                                {r.updated_at && r.updated_at !== r.created_at ? (
                                                    <> | 수정일: {new Date(r.updated_at).toLocaleString()}</>
                                                ) : null}
                                            </p>
                                            <p className="mt-1">{r.content}</p>
                                        </div>
                                        {/* ✅ 대댓글도 동일하게 Number() 변환 */}
                                        {r.user && Number(currentUserId) === Number(r.user.id) && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        console.log("대댓글 수정 버튼 클릭");
                                                        alert("대댓글 수정 기능 추가 필요");
                                                    }}
                                                    className="text-[10pt] text-blue-500 hover:underline"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        console.log("대댓글 삭제 시도, ID:", r.id);
                                                        if (window.confirm("정말 삭제하시겠습니까?")) {
                                                            dispatch(deleteComment({ commentId: r.id }));
                                                        }
                                                    }}
                                                    className="text-[10pt] text-red-500 hover:underline"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* 대댓글 작성 input */}
                    <div className="mt-2 flex flex-col gap-1">
                        <div className="relative">
                            <textarea
                                value={newReply}
                                onChange={e => setNewReply(e.target.value)}
                                placeholder="답글을 입력해주세요"
                                maxLength={500}
                                rows={3}
                                className="flex-1 border box-border rounded-[5pt] px-4 py-3 resize-none w-full"
                            />
                            <div
                                className={`absolute bottom-1 right-2 text-[12pt] px-1 py-2 pointer-events-none ${
                                    newReply.length >= 500 ? "text-red-500" : "text-gray-500"
                                }`}
                            >
                                {newReply.length} / 500
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddReply}
                                className="bg-[#39bf2d] text-white text-[13pt] px-4 py-2 rounded-[11px] w-[90px]"
                            >
                                작성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <hr className="border-0 h-[1px] bg-[#49cc90] my-4"/>
        </div>
    );
}