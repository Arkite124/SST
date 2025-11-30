import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext.jsx";

export default function DailyWritingEditModal({ writing, onSubmit }) {
    const { closeModal } = useModal();

    // 초기값을 안전하게 설정
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [mood, setMood] = useState(3);

    // writing prop이 변경될 때만 초기값 설정
    useEffect(() => {
        if (writing) {
            setTitle(writing.title || "");
            setContent(writing.content || "");
            setMood(writing.mood || 3);
        }
    }, [writing]);

    const handleSubmit = () => {
        // 422 에러 방지: 필수 필드 검증
        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        // 백엔드가 요구하는 형식: id 포함 필수!
        const submitData = {
            id: writing.id,  // ⭐ 백엔드 검증을 위해 id 포함
            title: title.trim(),
            content: content.trim(),
            mood: Number(mood),
        };

        console.log("전송 데이터:", submitData); // 디버깅용
        onSubmit(submitData);
        closeModal();
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeModal}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4 z-[100000]">
                <h2 className="text-xl font-bold">글 수정</h2>

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

                <div className="flex items-center gap-2">
                    <label className="font-medium">감정:</label>
                    <select
                        value={mood}
                        onChange={(e) => setMood(Number(e.target.value))}
                        className="border rounded p-2"
                    >
                        <option value={1}>😡 매우 나쁨</option>
                        <option value={2}>😢 나쁨</option>
                        <option value={3}>😐 보통</option>
                        <option value={4}>😄 좋음</option>
                        <option value={5}>😊 매우 좋음</option>
                    </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" label="취소" onClick={closeModal} />
                    <Button variant="primary" label="수정" onClick={handleSubmit} />
                </div>
            </div>
        </div>,
        document.body
    );
}