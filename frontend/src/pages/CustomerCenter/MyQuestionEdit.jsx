import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    setCategory,
    setTitle,
    setContent,
    resetForm,
    fetchSupportPostDetail,
    updateSupportPost,
} from "@/redux/slices/supportSlice";
import { useModal } from "@/contexts/ModalContext.jsx";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";
import useCheckUser from "@/hooks/useCheckUser.jsx";

const MyQuestionEdit = () => {
    useCheckUser();
    const { postId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { alert, confirm } = useModal();
    const {
        category,
        title,
        content,
        loading,
        postDetail,
    } = useSelector((state) => state.support);
    // 수정 화면에 기존 내용 불러오기
    useEffect(() => {
        dispatch(fetchSupportPostDetail(postId))
            .unwrap()
            .then((res) => {
                dispatch(setCategory(res.category));
                dispatch(setTitle(res.title));
                dispatch(setContent(res.content));
            })
            .catch(() => {
                alert("오류", "데이터를 불러오지 못했습니다.");
            });
    }, [postId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            return alert("수정 실패", "제목을 입력해주세요.");
        }
        if (!content.trim()) {
            return alert("수정 실패", "내용을 입력해주세요.");
        }

        try {
            await dispatch(
                updateSupportPost({
                    postId,
                    category,
                    title,
                    content,
                })
            ).unwrap();
            confirm("수정 완료", "문의 내용이 정상적으로 수정되었습니다!");
            // 원하면 상세 페이지로 이동
            navigate(`/support/${postId}`);

            dispatch(resetForm());
        } catch (err) {
            alert("수정 실패", err?.detail || "문의 수정에 실패했습니다.");
        }
    };

    if (loading && !postDetail) return <LoadingSpinner />;

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <h2 className="text-lg font-bold mb-4">문의 수정</h2>

            {/* 카테고리 */}
            <label className="text-sm font-semibold">카테고리</label>
            <select
                value={category}
                onChange={(e) => dispatch(setCategory(e.target.value))}
                className="border p-2 rounded w-full text-sm mb-3"
            >
                <option value="payment_error">결제 오류</option>
                <option value="report_user">유저 신고</option>
                <option value="service_question">서비스 문제</option>
                <option value="bug_report">버그 제보</option>
                <option value="etc">기타 문의</option>
            </select>

            {/* 제목 */}
            <label className="text-sm font-semibold">제목</label>
            <input
                className="border p-2 rounded w-full text-sm mb-3"
                value={title}
                onChange={(e) => dispatch(setTitle(e.target.value))}
                placeholder="제목을 입력해주세요."
            />

            {/* 내용 */}
            <label className="text-sm font-semibold">내용</label>
            <textarea
                className="border p-2 rounded w-full text-sm mb-3 resize-none h-40"
                value={content}
                onChange={(e) => dispatch(setContent(e.target.value))}
                placeholder="내용을 입력해주세요."
            />

            <button
                disabled={loading}
                className={`w-full py-2 rounded text-white ${
                    loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                }`}
            >
                {loading ? "수정 중..." : "수정하기"}
            </button>
        </form>
    );
};

export default MyQuestionEdit;
