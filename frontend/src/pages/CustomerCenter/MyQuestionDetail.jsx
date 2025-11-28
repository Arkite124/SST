import React from 'react';

function CommentItem({ comment }) {
    return (
        <div className="border rounded p-4 my-2">
            <p className="font-semibold">
                {comment.user.nickname} ({comment.user.role})
            </p>
            <p className="mt-1">{comment.content}</p>
            <p className="text-xs text-gray-500 mt-2">
                {new Date(comment.created_at).toLocaleString()}
            </p>

            {/* 🔥 대댓글 렌더링 */}
            <div className="pl-5 border-l mt-3">
                {comment.replies.map(r => (
                    <CommentItem key={r.id} comment={r} />
                ))}
            </div>
        </div>
    );
}

const MyQuestionDetail = () => {
    return (
        <div>
            
        </div>
    );
};

export default MyQuestionDetail;