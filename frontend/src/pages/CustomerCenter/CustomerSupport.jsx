import React from 'react';
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import {useModal} from "@/contexts/ModalContext.jsx";
// 내 문의 작성 하는 곳
const CustomerSupport = () => {
    const [category, setCategory] = useState("payment_error");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const { alert,confirm } = useModal();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if(title===""){
            alert("등록 실패","제목을 입력해 주세요.")
            return setLoading(false);
        }
        if(content===""){
            alert("등록 실패","내용을 입력해 주세요.")
            return setLoading(false);
        }
        try {
            const res = await axiosInstance.post("/customer-support/posts", {
                category,
                title,
                content
            });
            confirm("등록 성공","문의가 등록되었습니다!");
            return res.data;
        } catch {
            alert("등록 실패","문의 등록에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <h2 className="text-lg font-bold mb-4">문의 등록</h2>

            {/* Category */}
            <label className="text-sm font-semibold">카테고리</label>
            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border p-2 rounded w-full text-sm mb-3"
            >
                <option value="payment_error">결제 오류</option>
                <option value="report_user">유저 신고</option>
                <option value="service_question">서비스 문제</option>
                <option value="bug_report">버그 제보</option>
                <option value="etc">기타 문의</option>
            </select>

            {/* Title */}
            <label className="text-sm font-semibold">제목</label>
            <input
                className="border p-2 rounded w-full text-sm mb-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력해주세요."
                required
            />
            {/* Content */}
            <label className="text-sm font-semibold">내용</label>
            <textarea
                className="border p-2 rounded w-full text-sm mb-3 resize-none h-40"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력해주세요."
                required
            />
            <button
                disabled={loading}
                className={`w-full py-2 rounded text-white ${
                    loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                }`}
            >
                {loading ? "등록 중..." : "등록하기"}
            </button>
        </form>
    );
};
export default CustomerSupport;