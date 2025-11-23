// CommentList.jsx
import { useEffect, useState } from "react";

export default function CommentList({ postId }) {
    const [comments, setComments] = useState([]);

    useEffect(() => {
        fetch(``)
            .then(res => res.json())
            .then(data => setComments(data));
    }, [postId]);

    return (
        <div className="mt-4">
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
