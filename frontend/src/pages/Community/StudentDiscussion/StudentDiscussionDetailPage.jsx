import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PostDetail from "@/components/Community/PostDetail.jsx";
import CommentList from "@/components/Community/CommentList.jsx";
import axiosInstance from "@/utils/axiosInstance.js";
import { useModal } from "@/contexts/ModalContext.jsx";
import useCheckUser from "@/hooks/useCheckUser.jsx";  // ✅ 추가

export default function StudentDiscussionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { alert } = useModal();

    // ✅ 세션 복원 훅 추가
    useCheckUser();

    // Redux에서 user 가져오기
    const { user } = useSelector((state) => state.auth);

    console.log("=== 사용자 정보 ===");
    console.log("user:", user);
    console.log("user?.id:", user?.id);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/communities/student/posts/${id}`);
                const data = res.data;
                if (!data || !data.id) {
                    throw new Error("존재하지 않는 게시글입니다.");
                }
                setPost(data);
            } catch (err) {
                console.error(err);
                alert("오류", err.message || "게시글을 불러오지 못했습니다.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, navigate, alert]);

    if (loading) return <div>로딩 중...</div>;
    if (!post) return <div>게시글을 불러올 수 없습니다.</div>;

    return (
        <>
            <div className="p-4 bg-[#d8f2b8] rounded-[15pt] overflow-hidden">
                <div className="bg-[#fff] rounded-[13pt] p-6">
                    <PostDetail post={post} />
                </div>
            </div>
            <div className="mt-[30px] mb-6 p-4 bg-[#effbe0] rounded-[15pt] overflow-hidden">
                <div className="ml-[20px] mt-[10px] text-[18pt] text-[#52904d] font-extrabold">댓글</div>
                <CommentList
                    postId={id}
                    currentUserId={user?.id}
                />
            </div>
        </>
    );
}