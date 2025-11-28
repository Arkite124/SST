import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useModal } from "@/contexts/ModalContext.jsx";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

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

    const [page, setPage] = useState(1);
    const [size] = useState(8);
    const [total, setTotal] = useState(0);

    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { alert, confirm } = useModal();
    useAuthLoad();
    // 게시글 목록 가져오기
    const fetchPosts = async () => {
        setLoadingList(true);
        setError("");

        try {
            const res = await axiosInstance.get(`/communities/student/posts?page=${page}&size=${size}`);
            setPosts(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            if (err.response?.status === 401) {
                await alert("로그인이 필요합니다", "세션이 만료되었습니다. 다시 로그인해주세요.");
                navigate("/login");
            } else {
                await alert("오류", "목록을 불러오지 못했습니다.");
            }
        } finally {
            setLoadingList(false);
        }
    };

    // 게시글 등록
    const addPost = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            await axiosInstance.post("/communities/student/posts", {
                user_id: user.id,
                discussion_tags: discussionTags,
                title,
                book_title: bookTitle,
                content,
            });
            await confirm("등록 완료", "게시글이 성공적으로 등록되었습니다.");
            setPage(1);
            fetchPosts();
            setDiscussionTags("");
            setTitle("");
            setBookTitle("");
            setContent("");
        } catch (err) {
            console.error("❌ 등록 실패:", err);
            await alert("등록 실패", "게시글 등록 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // 게시글 삭제
    const deletePost = async (id) => {
        const ok = await alert("삭제 확인", "정말 삭제하시겠습니까?");
        if (!ok) return;
        const prev = posts;
        setPosts(posts.filter((p) => p.id !== id));
        try {
            await axiosInstance.delete(`/communities/student/posts/${id}`);
            await confirm("삭제 완료", "게시글이 삭제되었습니다.");
            fetchPosts();
        } catch (err) {
            setPosts(prev);
            if (err.response?.status === 401) {
                await alert("로그인이 필요합니다", "세션이 만료되었습니다.");
                navigate("/login");
            } else {
                await alert("오류", "게시글 삭제 중 오류가 발생했습니다.");
            }
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [page]);

    const totalPages = Math.ceil(total / size);
    return (
        <div className="p-1">
            <h1 className="text-3xl font-black text-[#4E944F] mb-5 ml-3">독서 토론 게시판</h1>
            {/* 제목 + 버튼 */}
            <div className="flex justify-end items-center mb-2">

                {user && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-[#149607] text-white rounded-xl hover:bg-[#f3feb0] hover:text-[#149607]  transition-colors font-semibold"
                    >
                        {showForm ? "▲ 글쓰기 폼 닫기" : "＋ 새 글쓰기"}
                    </button>
                )}
            </div>

            {/* 입력 폼 */}
            {showForm && (
                <form
                    onSubmit={addPost}
                    className="border rounded-2xl p-2 mb-6 bg-[#E9EFC0] border-[#B4E197] transition-all duration-300"
                >
                    {/* 태그 */}
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-[#4E944F]">토론 주제 태그</label>
                        <select
                            value={discussionTags}
                            onChange={(e) => setDiscussionTags(e.target.value)}
                            disabled={submitting}
                            className="w-full border-2 border-[#B4E197] p-1 rounded-xl focus:ring-2 focus:ring-[#83BD75] bg-white"
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
                        <label className="font-semibold text-[#4E944F]">토론 제목</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="토론 제목을 입력하세요"
                            className="border-2 border-[#B4E197] p-2 rounded-xl"
                            disabled={submitting}
                        />
                    </div>

                    {/* 도서 제목 */}
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-[#4E944F]">관련 도서 제목</label>
                        <input
                            value={bookTitle}
                            onChange={(e) => setBookTitle(e.target.value)}
                            placeholder="관련된 책 제목을 입력하세요"
                            className="border-2 border-[#B4E197] p-2 rounded-xl"
                            disabled={submitting}
                        />
                    </div>

                    {/* 내용 */}
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-[#4E944F]">토론 내용</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="토론 내용을 입력하세요"
                            className="border-2 border-[#B4E197] p-2 rounded-xl h-24 resize-none"
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

            {/* 게시글 목록 */}
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
                                <li key={post.id} className="border-[3px] p-3 pl-6 pr-6 pb-4 pt-4 rounded-2xl flex flex-col items-start
                                                             bg-white border-[#b3e0a8]
                                                             hover:-translate-y-1 hover:shadow-md
                                                             transition-transform transition-shadow duration-200"
                                    onClick={() => navigate(`/community/student-discussion/${post.id}`)}>
                                    <span className="flex w-full justify-between items-center mb-1">
                                        <span>
                                            <span className="bg-[#fff588] text-[#946F3C] font-bold px-3 py-1.5 rounded-full text-[10pt]">
                                                #{post.discussion_tags}
                                            </span>
                                            &nbsp;

                                        </span>
                                        <span className="text-gray-500 text-sm ">{formattedDate}</span>
                                    </span>

                                    <span className="text-[16pt] font-extrabold mb-1 whitespace-nowrap overflow-hidden text-ellipsis w-[80%] inline-block">{post.title}</span>
                                    <span className="text-gray-500 font-extrabold text-[14pt] whitespace-nowrap overflow-hidden text-ellipsis w-[80%] inline-block">{post.book_title}</span>
                                    <span className="flex w-full justify-between items-start mt-1">
                                        <span className="text-[#888888] whitespace-nowrap overflow-hidden text-ellipsis w-[80%] inline-block">
                                            {post.content}
                                        </span>

                                        {user && post.user_id === user.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // 클릭 이벤트 버블 방지
                                                    deletePost(post.id);
                                                }}
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

                    {/* 페이지네이션 */}
                    <div className="flex justify-center items-center gap-4 mt-4">
                        {/* 처음으로 */}
                        {page > 1 && (
                            <button
                                onClick={() => setPage(1)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#B4E197] text-white hover:bg-[#83BD75]"
                            >
                                « 처음으로
                            </button>
                        )}

                        {/* 이전 */}
                        {page > 1 && (
                            <button
                                onClick={() => setPage((prev) => prev - 1)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#83BD75] text-white hover:bg-[#4E944F]"
                            >
                                ◀ 이전
                            </button>
                        )}

                        <span className="font-semibold text-gray-700">
                            {page} / {totalPages || 1}
                        </span>

                        {/* 다음 */}
                        {page < totalPages && (
                            <button
                                onClick={() => setPage((prev) => prev + 1)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#83BD75] text-white hover:bg-[#4E944F]"
                            >
                                다음 ▶
                            </button>
                        )}

                        {/* 마지막으로 */}
                        {page < totalPages && (
                            <button
                                onClick={() => setPage(totalPages)}
                                className="px-4 py-2 rounded-xl font-semibold bg-[#B4E197] text-white hover:bg-[#83BD75]"
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
