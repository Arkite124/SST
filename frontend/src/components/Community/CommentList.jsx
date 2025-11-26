// CommentList.jsx
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {useModal} from "@/contexts/ModalContext.jsx";

export default function CommentList({ postId }) {
    const [comments, setComments] = useState([]);
    const {alert}=useModal()
    const [page, setPage] = useState(1);
    const [size] = useState(8);
    const [total, setTotal] = useState(0);
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const res = await axiosInstance.get(`communities/student/posts/${postId}/comments?page=${page}&size=${size}`);
                setComments(res.data.items || []);
                setTotal(res.data.total || 0);
            } catch {
                alert("서버 오류","연결을 확인해주세요.")
            }
        };
        fetchComments();
    }, [postId,page,size]);

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
