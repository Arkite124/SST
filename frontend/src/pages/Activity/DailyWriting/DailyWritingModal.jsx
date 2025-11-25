import { useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function DailyWritingModal({ onSubmit }) {
    const [content, setContent] = useState("");
    const [mood, setMood] = useState(5);
    const [title, setTitle] = useState("");
    const [attachment_url, setAttachment_url] = useState("");

    const { alert, closeModal } = useModal();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            await alert("입력 오류", "내용을 입력해주세요!");
            return;
        }

        const created_at = new Date().toISOString().split("T")[0];

        onSubmit({ title, content, mood, created_at, attachment_url });
        closeModal();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={closeModal}
            />

            {/* 모달 박스 */}
            <form
                onSubmit={handleSubmit}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 z-[10000] space-y-6"
            >
                {/* ====== 기존 form 내용 그대로 ====== */}

                <div>
                    <label>
                        오늘의 일기 제목
                        <input
                            type="text"
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem] focus:ring-2 focus:ring-[#4E944F]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="오늘의 일기 제목은 뭔가요?"
                            required
                        />
                    </label>
                </div>

                <div>
                    <label>
                        오늘 하루는 어땠나요?
                        <textarea
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[300px] focus:ring-2 focus:ring-[#4E944F]
               resize-none overflow-y-auto"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="내용을 입력해주세요"
                            required
                        />

                    </label>
                </div>

                <div className="flex justify-between items-center">
                    <label className="text-gray-600 select-none">
                        오늘의 감정
                        <select
                            value={mood}
                            onChange={(e) => setMood(Number(e.target.value))}
                            className="border border-[#B4E197] rounded-lg p-1 focus:ring-2 focus:ring-[#4E944F]"
                            required
                        >
                            <option value={5}>😊</option>
                            <option value={4}>😄</option>
                            <option value={3}>😐</option>
                            <option value={2}>😢</option>
                            <option value={1}>😡</option>
                        </select>
                    </label>
                </div>

                {/*사진 넣는 부분*/}
                {/*<div>*/}
                {/*    <label>*/}
                {/*        참고 링크*/}
                {/*        <input*/}
                {/*            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem] focus:ring-2 focus:ring-[#4E944F]"*/}
                {/*            value={attachment_url}*/}
                {/*            onChange={(e) => setAttachment_url(e.target.value)}*/}
                {/*            placeholder="함께 본 사이트 링크가 있다면 입력해주세요"*/}
                {/*        />*/}
                {/*    </label>*/}
                {/*</div>*/}

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeModal} label="취소" />
                    <Button type="submit" label="등록" />
                </div>
            </form>
        </div>,
        document.body
    );
}
