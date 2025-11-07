import { useEffect, useState } from "react";
import axios from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "@/utils/axiosInstance.js";
import {toast} from "react-toastify";

export default function StudentDiscussionPage() {
    const [posts, setPosts] = useState([]);
    const [discussionTags, setDiscussionTags] = useState("");
    const [title, setTitle] = useState("");
    const [bookTitle, setBookTitle] = useState("");
    const [content, setContent] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);

    // ✅ 페이지네이션 상태
    const [page, setPage] = useState(1);
    const [size] = useState(8);
    const [total, setTotal] = useState(0);

    const navigate = useNavigate();
    const {user,loading} = useSelector((state) => state.auth);
    useEffect(() => {
        if (user == null) {
            toast.error("이용하려면 로그인 해주세요.", { autoClose: 2000 });
            navigate("/login")// 로그인 사이트으로 이동
        }
    }, [user, navigate]);
    // ✅ 게시글 목록 가져오기
    const fetchPosts = async () => {
        setLoadingList(true);
        setError("");
        try {
            const res = await axios.get(`/community/student/posts?page=${page}&size=${size}`);
            setPosts(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch (err) {
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

    // ✅ 게시글 등록
    const addPost = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const res = await axiosInstance.post("/community/student/posts", {
                user_id: user.id,
                discussion_tags: discussionTags,
                title,
                book_title: bookTitle,
                content,
            });

            // 새 게시글 등록 후 첫 페이지로 돌아가기
            setPage(1);
            fetchPosts();

            // 입력값 초기화
            setDiscussionTags("");
            setTitle("");
            setBookTitle("");
            setContent("");
        } catch (err) {
            console.error("❌ 등록 실패:", err);
            setError("게시글 등록 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ 게시글 삭제
    const deletePost = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        const prev = posts;
        setPosts(posts.filter((p) => p.id !== id));
        try {
            await axios.delete(`/community/student/${id}`);
            fetchPosts();
        } catch (err) {
            setPosts(prev);
            if (err.response?.status === 401) {
                alert("세션이 만료되었습니다.");
                navigate("/login");
            } else {
                setError("게시글 삭제 중 오류가 발생했습니다.");
            }
        }
    };

    // ✅ 페이지 변경 시 목록 다시 로드
    useEffect(() => {
        fetchPosts();
    }, [page]);

    const totalPages = Math.ceil(total / size);

    return (
        <div className="p-1">
            {/* ✅ 제목 + 버튼 묶기 */}
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-[#4E944F]">학생 토론 게시판</h1>
                {user && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-[#83BD75] text-white rounded-xl hover:bg-[#4E944F] transition-colors font-semibold"
                    >
                        {showForm ? "▲ 글쓰기 폼 닫기" : "＋ 새 게시글 작성"}
                    </button>
                )}
            </div>

            {/* ✅ 입력 폼 */}
            {showForm && (
                <form
                    onSubmit={addPost}
                    className="border rounded-2xl p-2 mb-6 bg-[#E9EFC0] border-[#B4E197] transition-all duration-300"
                >
                    {/* 태그 */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="discussionTags" className="font-semibold text-[#4E944F]">
                            토론 주제 태그
                        </label>
                        <select
                            id="discussionTags"
                            value={discussionTags}
                            onChange={(e) => setDiscussionTags(e.target.value)}
                            disabled={submitting}
                            className="w-full border-2 border-[#B4E197] p-1 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white text-gray-700 font-semibold shadow-sm hover:border-[#83BD75] transition"
                        >
                            <option value="" disabled>태그를 선택하세요</option>
                            <option value="친구">친구</option>
                            <option value="사랑">사랑</option>
                            <option value="부모님">부모님</option>
                            <option value="우정">우정</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>

                    {/* 제목 */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="title" className="font-semibold text-[#4E944F]">토론 제목</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="토론 제목을 입력하세요"
                            className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white"
                            disabled={submitting}
                        />
                    </div>

                    {/* 도서 제목 */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="bookTitle" className="font-semibold text-[#4E944F]">관련 도서 제목</label>
                        <input
                            id="bookTitle"
                            type="text"
                            value={bookTitle}
                            onChange={(e) => setBookTitle(e.target.value)}
                            placeholder="관련된 책 제목을 입력하세요"
                            className="border-2 border-[#B4E197] p-2 rounded-xl focus:ring-2 focus:ring-[#83BD75] focus:outline-none bg-white"
                            disabled={submitting}
                        />
                    </div>

                    {/* 내용 */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="content" className="font-semibold text-[#4E944F]">토론 내용</label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="토론 내용을 입력하세요"
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
            )}

            {/* ✅ 게시글 목록 */}
            {loadingList ? (
                <p className="text-gray-500 mb-2">불러오는 중...</p>
            ) : posts.length === 0 ? (
                <div className="border rounded-2xl p-2 text-center text-gray-500 bg-white">
                    등록된 게시글이 없습니다.
                </div>
            ) : (
                <>
                    <ul className="space-y-2">
                        {posts.map((post) => {
                            const dateObj = new Date(post.created_at);
                            const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${dateObj.getHours()}시 ${dateObj.getMinutes()}분`;

                            return (
                                <li key={post.id} className="border p-3 rounded-2xl flex flex-col items-start bg-white">
                                    <span className="flex w-full justify-between items-center mb-1">
                                        <span>
                                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                                #{post.discussion_tags}
                                            </span>
                                            &nbsp;
                                            <span className="bg-blue-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                                #{post.book_title}
                                            </span>
                                        </span>
                                        <span className="text-gray-500 text-sm">{formattedDate}</span>
                                    </span>

                                    <span className="font-semibold mb-1">{post.title}</span>
                                    <span className="flex w-full justify-between items-start mt-2">
                                        <span className="whitespace-pre-wrap">{post.content}</span>
                                        {user && post.user_id === user.id && (
                                            <button
                                                onClick={() => deletePost(post.id)}
                                                className="text-red-600 hover:text-red-700 text-sm"
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {/* ✅ 페이지네이션 버튼 */}
                    <div className="flex justify-center items-center gap-4 mt-4">
                        {/* 🟢 처음으로 버튼 */}
                        {page > 1 && (
                            <button
                                onClick={() => setPage(1)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#B4E197] text-white hover:bg-[#83BD75] transition"
                            >
                                « 처음으로
                            </button>
                        )}

                        {/* ◀ 이전 */}
                        {page > 1 && (
                            <button
                                onClick={() => setPage((prev) => prev - 1)}
                                className={`px-4 py-2 rounded-xl font-semibold ${
                                    page === 1
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-[#83BD75] text-white hover:bg-[#4E944F]"
                                }`}
                            >
                                ◀ 이전
                            </button>
                        )}

                        {/* 현재 페이지 표시 */}
                        <span className="font-semibold text-gray-700">
        {page} / {totalPages || 1}
    </span>

                        {/* ▶ 다음 */}
                        {page < totalPages && (
                            <button
                                onClick={() => setPage((prev) => prev + 1)}
                                className={`px-4 py-2 rounded-xl font-semibold ${
                                    page >= totalPages
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-[#83BD75] text-white hover:bg-[#4E944F]"
                                }`}
                            >
                                다음 ▶
                            </button>
                        )}

                        {/* 🟢 마지막으로 버튼 */}
                        {page < totalPages && (
                            <button
                                onClick={() => setPage(totalPages)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#B4E197] text-white hover:bg-[#83BD75] transition"
                            >
                                마지막으로 »
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
