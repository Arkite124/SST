// DailyWritingEditModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext.jsx";

export default function DailyWritingEditModal({ writing, onSubmit }) {
    const { closeModal } = useModal();
    const [title, setTitle] = useState(writing.title || "");
    const [content, setContent] = useState(writing.content || "");
    const [mood, setMood] = useState(writing.mood || 3);

    const handleSubmit = () => {
        onSubmit({ title, content, mood });
        closeModal();
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            {/* 배경 반투명 */}
            <div
                className="absolute inset-0 bg-black/30"
                onClick={closeModal} // 배경 클릭 시 모달 닫기
            ></div>

            {/* 실제 모달 */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4 z-[100000]">
                <input
                    type="text"
                    placeholder="제목"
                    className="w-full border rounded p-2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                    placeholder="내용"
                    className="w-full border rounded p-2 h-40"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <select
                    value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    className="border rounded p-2"
                >
                    <option value={1}>😡</option>
                    <option value={2}>😢</option>
                    <option value={3}>😐</option>
                    <option value={4}>😄</option>
                    <option value={5}>😊</option>
                </select>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" label="취소" onClick={closeModal} />
                    <Button variant="primary" label="수정" onClick={handleSubmit} />
                </div>
            </div>
        </div>,
        document.body
    );
}
