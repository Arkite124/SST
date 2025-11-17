// src/pages/Activity/ReadingLog/ReadingLogModal.jsx
import { useState } from "react";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function ReadingLogModal({ onSubmit }) {
    const [book_title, setBookTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [publisher, setPublisher] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState("");
    const [link, setLink] = useState("");
    const { closeModal, alert } = useModal();   // ⭐ alert 추가
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!book_title.trim()) {
            await alert("입력 오류", "책 제목을 입력해주세요!");
            return;
        }

        const created_at = new Date().toISOString();

        onSubmit({
            book_title,
            author,
            publisher,
            content,
            image,
            link,
            created_at,
        });

        closeModal();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div>
                <label>
                    책 제목 *
                    <input
                        className="w-full border rounded-lg p-2 mt-1"
                        value={book_title}
                        onChange={(e) => setBookTitle(e.target.value)}
                        required
                        placeholder="책 제목을 입력하세요"
                    />
                </label>
            </div>

            <div>
                <label>
                    저자
                    <input
                        className="w-full border rounded-lg p-2 mt-1"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="저자를 입력하세요"
                    />
                </label>
            </div>

            <div>
                <label>
                    출판사
                    <input
                        className="w-full border rounded-lg p-2 mt-1"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        placeholder="출판사를 입력하세요"
                    />
                </label>
            </div>

            <div>
                <label>
                    내용
                    <textarea
                        className="w-full border rounded-lg p-2 mt-1 h-32"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        placeholder="독서록 내용을 입력하세요"
                    />
                </label>
            </div>

            <div>
                <label>
                    이미지 URL
                    <input
                        className="w-full border rounded-lg p-2 mt-1"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="책 이미지 URL"
                    />
                </label>
            </div>

            <div>
                <label>
                    네이버 링크
                    <input
                        className="w-full border rounded-lg p-2 mt-1"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="책 상세보기 링크"
                    />
                </label>
            </div>

            <div className="flex justify-end gap-3">
                <Button label="취소" variant="secondary" onClick={closeModal} />
                <Button label="등록" type="submit" />
            </div>
        </form>
    );
}
