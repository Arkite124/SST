// src/pages/Activity/ReadingLog/ReadingLogEditModal.jsx

import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function ReadingLogEditModal({ log, onSubmit }) {
    const [bookTitle, setBookTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [publisher, setPublisher] = useState("");
    const [content, setContent] = useState("");
    const [unknownSentence, setUnknownSentence] = useState("");

    const { closeModal, alert } = useModal();   // ⭐ alert 추가

    useEffect(() => {
        if (log) {
            setBookTitle(log.book_title || "");
            setAuthor(log.author || "");
            setPublisher(log.publisher || "");
            setContent(log.content || "");
            setUnknownSentence(log.unknown_sentence || "");
        }
    }, [log]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!bookTitle.trim() || !content.trim()) {
            await alert("입력 오류", "책 제목과 느낀 점은 필수 입력 항목입니다."); // ⭐ 기존 alert 대체
            return;
        }

        onSubmit({
            book_title: bookTitle,
            author,
            publisher,
            content,
            unknown_sentence: unknownSentence,
        });

        closeModal();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            <div>
                <label className="block mb-1 text-gray-600">책 제목 *</label>
                <input
                    type="text"
                    className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block mb-1 text-gray-600">저자</label>
                <input
                    type="text"
                    className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                />
            </div>

            <div>
                <label className="block mb-1 text-gray-600">출판사</label>
                <input
                    type="text"
                    className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                />
            </div>

            <div>
                <label className="block mb-1 text-gray-600">느낀 점 *</label>
                <textarea
                    className="w-full border rounded-xl p-2 h-32 focus:ring-2 focus:ring-[#4E944F]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block mb-1 text-gray-600">어려웠던 문장</label>
                <textarea
                    className="w-full border rounded-xl p-2 h-24 focus:ring-2 focus:ring-[#4E944F]"
                    value={unknownSentence}
                    onChange={(e) => setUnknownSentence(e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeModal} label="취소" />
                <Button type="submit" label="저장" />
            </div>
        </form>
    );
}
