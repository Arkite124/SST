// src/pages/Activity/ReadingLog/ReadingLogModal.jsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function ReadingLogModal({ log = null, onSubmit }) {
    const [bookTitle, setBookTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [publisher, setPublisher] = useState("");
    const [content, setContent] = useState("");
    const [unknownSentence, setUnknownSentence] = useState("");
    const [image, setImage] = useState("");
    const [link, setLink] = useState("");
    const { closeModal, alert } = useModal();

    // 기존 데이터가 있을 경우 세팅 (편집 모드)
    useEffect(() => {
        if (log) {
            setBookTitle(log.book_title || "");
            setAuthor(log.author || "");
            setPublisher(log.publisher || "");
            setContent(log.content || "");
            setUnknownSentence(log.unknown_sentence || "");
            setImage(log.image || "");
            setLink(log.link || "");
        }
    }, [log]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!bookTitle.trim() || !content.trim()) {
            await alert("입력 오류", "책 제목과 내용은 필수 입력 항목입니다.");
            return;
        }

        const created_at = new Date().toISOString();

        onSubmit({
            book_title: bookTitle,
            author,
            publisher,
            content,
            unknown_sentence: unknownSentence,
            image,
            link,
            created_at,
        });

        closeModal();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={closeModal}
            />

            {/* 모달 컨텐츠 */}
            <form
                onSubmit={handleSubmit}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 z-[10000] space-y-5"
            >
                <div>
                    <label className="block mb-1 text-gray-600">책 제목 *</label>
                    <input
                        type="text"
                        className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        required
                        placeholder="책 제목을 입력하세요."
                    />
                </div>

                <div>
                    <label className="block mb-1 text-gray-600">저자</label>
                    <input
                        type="text"
                        className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="저자를 입력하세요."
                    />
                </div>

                <div>
                    <label className="block mb-1 text-gray-600">출판사</label>
                    <input
                        type="text"
                        className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        placeholder="출판사를 입력하세요."
                    />
                </div>

                <div>
                    <label className="block mb-1 text-gray-600">내용 *</label>
                    <textarea
                        className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F] h-32 max-h-[200px] overflow-y-auto resize-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        placeholder="책을 읽으면서 느낀 점, 생각 등을 적어주세요."
                    />
                </div>

                <div>
                    <label className="block mb-1 text-gray-600">어려웠던 문장</label>
                    <textarea
                        className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F] h-32 max-h-[200px] overflow-y-auto resize-none"
                        value={unknownSentence}
                        onChange={(e) => setUnknownSentence(e.target.value)}
                        placeholder="읽으면서 어려웠던 문장을 적어주세요."
                    />
                </div>


                <div className="flex justify-end gap-3">
                    <Button label="취소" variant="secondary" onClick={closeModal} />
                    <Button label={log ? "수정" : "등록"} type="submit" />
                </div>
            </form>
        </div>,
        document.body
    );
}
