import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PostDetail from "@/components/Community/PostDetail.jsx";
import CommentList from "@/components/Community/CommentList.jsx";

export default function StudentDiscussionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/community/student/posts/${id}`, {
                    headers: { "Accept": "application/json" } // JSON 요청 명시
                });

                if (!res.ok) {
                    // 404, 500 등 에러 상태 처리
                    throw new Error(`게시글을 불러오지 못했습니다. (status: ${res.status})`);
                }

                const data = await res.json();

                // 데이터가 실제로 있는지 확인
                if (!data || !data.id) {
                    throw new Error("존재하지 않는 게시글입니다.");
                }

                setPost(data);
            } catch (err) {
                console.error(err);
                alert(err.message);
                navigate(-1); // 에러 시 뒤로가기
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [id, navigate]);

    if (loading) return <div>로딩 중...</div>;
    if (!post) return <div>게시글을 불러올 수 없습니다.</div>;

    return (
        <div className="p-6">
            <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-200 rounded"
            >
                ← 뒤로가기
            </button>

            <PostDetail post={post} />
            <CommentList postId={id} />
        </div>
    );
}
