// CommentList.jsx
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import { useModal } from "@/contexts/ModalContext.jsx";

export default function CommentList({ postId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const { alert } = useModal();

    // 댓글 조회
    const fetchComments = async () => {
        try {
            const res = await axiosInstance.get(
                `/communities/student/comments/${postId}`
            );
            setComments(res.data);
        } catch {
            alert("서버 오류", "연결을 확인해주세요.");
        }
    };

    useEffect(() => {
        fetchComments();
    }, [postId]);

    // 댓글 작성
    const handleSubmit = async () => {
        if (!newComment.trim()) {
            return alert("입력 오류", "댓글 내용을 입력해주세요.");
        }

        try {
            await axiosInstance.post(
                `/communities/student/comments?parent_id=${postId}`,
                {content: newComment}
            );

            setNewComment(""); // 입력창 초기화
            fetchComments(); // 댓글 목록 새로고침
        } catch (err) {
            alert("작성 실패", "댓글 작성 중 문제가 발생했습니다.");
        }
    };

    return (
        <div className="mt-6">

            {/* 입력 폼 */}
            <div className="mb-4 flex items-center gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요"
                    className="flex-1 border rounded px-3 py-2"
                />
                <button
                    onClick={handleSubmit}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    작성
                </button>
            </div>

            {/* 댓글 목록 */}
            {comments.length === 0 ? (
                <p>댓글이 없습니다.</p>
            ) : (
                comments.map(c => (
                    <div key={c.id} className="border p-2 rounded mb-2">
                        <p>{c.content}</p>
                    </div>
                ))
            )}
        </div>
    );
}
