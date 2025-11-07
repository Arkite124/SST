import { useEffect, useState } from "react";
import axios from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import axiosInstance from "@/utils/axiosInstance.js";

export default function ParentBoardPage() {
    const [posts, setPosts] = useState([]);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [content, setContent] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const navigate = useNavigate();

    const user = useSelector((state) => state.auth.user); // ✅ Redux user 가져오기
    useAuthLoad();

    // 📖 목록 불러오기
    const fetchPosts = async () => {
        setLoadingList(true);
        setError("");
        try {
            const res = await axios.get(`/community/parent/posts?page=${page}&size=${size}`);
            setPosts(res.data || []);
        } catch (err) {
            console.error("❌ 목록 실패:", err);
            if (err.response?.status === 401) {
                alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                navigate("/login");
            } else {
                setError("목록을 불러오지 못했습니다.");
            }
        } finally {
            setLoadingList(false);
        }
    };

    // 📝 게시글 작성
    const addPost = async (e) => {
        e.preventDefault();

        if (!user) {
            alert("로그인이 필요합니다.");
            navigate("/login");
            return;
        }
        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 입력해주세요!");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const res = await axiosInstance.post("/community/parent/posts", {
                user_id: user.id,
                parent_id: null,
                title,
                content,
                category,
                is_important: false,
            });

            const newPost = {
                id: res.data?.id ?? Date.now(),
                created_at: res.data?.created_at ?? new Date().toISOString(),
                ...res.data,
            };

            // 낙관적 업데이트
            setPosts((prev) => [newPost, ...prev]);

            // 입력 초기화
            setTitle("");
            setCategory("");
            setContent("");
        } catch (err) {
            console.error("추가 실패:", err);
            if (err.response?.status === 401) {
                alert("로그인이 필요합니다.");
                navigate("/login");
            } else {
                setError("게시글 등록 중 오류가 발생했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 🗑 삭제
    const deletePost = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        const prev = posts;
        setPosts(posts.filter((p) => p.id !== id)); // 낙관적 삭제
        try {
            await axios.delete(`/community/parent/posts/${id}`);
        } catch (err) {
            console.error("삭제 실패:", err);
            setPosts(prev); // 롤백
            if (err.response?.status === 401) {
                alert("세션이 만료되었습니다.");
                navigate("/login");
            } else {
                setError("게시글 삭제 중 오류가 발생했습니다.");
            }
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-[#4E944F]">부모 커뮤니티</h1>

            {/* ✅ 게시글 작성 폼 */}
            <form
                onSubmit={addPost}
                className="border rounded-2xl p-4 mb-6 bg-[#E9EFC0] border-[#B4E197] space-y-4"
            >
                <div className="flex flex-col gap-2">
                    <label htmlFor="category" className="font-semibold text-[#4E944F]">
                        카테고리
                    </label>
                    <input
                        id="category"
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="예: 육아, 교육, 가정소통 등"
                        className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white"
                        disabled={submitting}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="title" className="font-semibold text-[#4E944F]">
                        제목
                    </label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="게시글 제목을 입력하세요"
                        className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white"
                        disabled={submitting}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="content" className="font-semibold text-[#4E944F]">
                        내용
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="게시글 내용을 입력하세요"
                        className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white h-24 resize-none"
                        disabled={submitting}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full px-4 py-2 rounded-xl text-white font-semibold transition-colors ${
                        submitting ? "bg-gray-400" : "bg-[#4E944F] hover:bg-[#3a7a3d]"
                    }`}
                >
                    {submitting ? "등록 중..." : "게시글 등록"}
                </button>

                {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>

            {/* 게시글 목록 */}
            {loadingList ? (
                <p className="text-gray-500 mb-2">불러오는 중...</p>
            ) : posts.length === 0 ? (
                <div className="border rounded-2xl p-8 text-center text-gray-500 bg-white">
                    등록된 게시글이 없습니다.
                </div>
            ) : (
                <ul className="space-y-2">
                    {posts.map((post) => {
                        const dateObj = new Date(post.created_at);
                        const formattedDate = `${dateObj.getFullYear()}년 ${
                            dateObj.getMonth() + 1
                        }월 ${dateObj.getDate()}일 ${dateObj.getHours()}시 ${dateObj.getMinutes()}분`;

                        return (
                            <li
                                key={post.id || `temp-${post.title}`}
                                className="border p-3 rounded-2xl flex flex-col items-start bg-white"
                            >
                                {/* 상단: 카테고리 + 날짜 */}
                                <span className="flex w-full justify-between items-center mb-1">
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                        #{post.category || "기타"}
                                    </span>
                                    <span className="text-gray-500 text-sm">{formattedDate}</span>
                                </span>

                                {/* 제목 */}
                                <span className="font-semibold mb-1">{post.title}</span>

                                {/* 내용 + 삭제 버튼 */}
                                <span className="flex w-full justify-between items-start mt-2">
                                    <span className="whitespace-pre-wrap">{post.content}</span>
                                    <button
                                        onClick={() => deletePost(post.id)}
                                        className="text-red-600 hover:text-red-700 text-sm"
                                    >
                                        삭제
                                    </button>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
