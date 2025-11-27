// src/pages/Activity/DailyWriting/DailyWritingEditModal.jsx
import { useState } from "react";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function DailyWritingEditModal({ writing, onSubmit }) {
    const [content, setContent] = useState(writing.content || "");
    const [mood, setMood] = useState(writing.mood || 5);
    const [title, setTitle] = useState(writing.title || "");
    const [attachment_url, setAttachment_url] = useState(writing.attachment_url || "");
    const { alert, closeModal } = useModal();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            await alert("입력 오류", "내용은 반드시 입력해야 합니다.");
            return;
        }

        onSubmit({
            title,
            content,
            mood,
            attachment_url,
        });
        closeModal();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={closeModal}
            />

            {/* 모달 컨텐츠 */}
            <form
                onSubmit={handleSubmit}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 z-[10000] space-y-6"
            >
                {/* 제목 */}
                <div>
                    <label>
                        제목 수정
                        <input
                            type="text"
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem] focus:ring-2 focus:ring-[#4E944F]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </label>
                </div>

                {/* 내용 */}
                <div>
                    <label>
                        내용 수정
                        <textarea
                            className="w-full border border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F] h-[200px] max-h-[200px] overflow-y-auto resize-none"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </label>
                </div>

                {/* 감정 */}
                <div>
                    <label>
                        감정 수정
                        <select
                            value={mood}
                            onChange={(e) => setMood(Number(e.target.value))}
                            className="border border-[#B4E197] rounded-lg p-1 focus:ring-2 focus:ring-[#4E944F]"
                        >
                            <option value={5}>😊</option>
                            <option value={4}>😄</option>
                            <option value={3}>😐</option>
                            <option value={2}>😢</option>
                            <option value={1}>😡</option>
                        </select>
                    </label>
                </div>

                {/* 링크 */}
                <div>
                    <label>
                        참고 링크
                        <input
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem]"
                            value={attachment_url}
                            onChange={(e) => setAttachment_url(e.target.value)}
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeModal} label="취소" />
                    <Button type="submit" label="수정" />
                </div>
            </form>
        </div>
    );
}
