import { useState } from "react";
import Button from "@/components/common/Button";

export default function ReadingLogModal({ onSubmit, onClose }) {
    const [bookTitle, setBookTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [publisher, setPublisher] = useState("");
    const [content, setContent] = useState("");
    const [unknownSentence, setUnknownSentence] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!bookTitle.trim() || !content.trim()) {
            alert("책 제목과 느낀 점은 필수로 입력해주세요!");
            return;
        }

        const created_at = new Date().toISOString();
        onSubmit({
            book_title: bookTitle,
            author,
            publisher,
            content,
            unknown_sentence: unknownSentence,
            created_at
        });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#4E944F] text-center">
                📚 새 독서록 작성
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 책 제목 */}
                <div>
                    <label className="block mb-1 text-gray-600">책 제목 *</label>
                    <input
                        type="text"
                        className="w-full border border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="읽은 책의 제목을 입력하세요"
                        required
                    />
                </div>

                {/* 저자 */}
                <div>
                    <label className="block mb-1 text-gray-600">저자</label>
                    <input
                        type="text"
                        className="w-full border border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="책의 저자를 입력하세요"
                    />
                </div>

                {/* 출판사 */}
                <div>
                    <label className="block mb-1 text-gray-600">출판사</label>
                    <input
                        type="text"
                        className="w-full border border-[#B4E197] rounded-xl p-2 focus:ring-2 focus:ring-[#4E944F]"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        placeholder="출판사를 입력하세요"
                    />
                </div>

                {/* 느낀 점 (내용) */}
                <div>
                    <label className="block mb-1 text-gray-600">느낀 점 *</label>
                    <textarea
                        className="w-full border border-[#B4E197] rounded-xl p-2 h-32 focus:ring-2 focus:ring-[#4E944F]"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="책을 읽고 느낀 점을 작성하세요"
                        required
                    />
                </div>

                {/* 모르는 문장 */}
                <div>
                    <label className="block mb-1 text-gray-600">어려웠던 문장</label>
                    <textarea
                        className="w-full border border-[#B4E197] rounded-xl p-2 h-24 focus:ring-2 focus:ring-[#4E944F]"
                        value={unknownSentence}
                        onChange={(e) => setUnknownSentence(e.target.value)}
                        placeholder="읽으면서 어려웠거나 이해가 안된 문장을 적어주세요"
                    />
                </div>

                {/* 버튼 */}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} label={"취소"}/>
                    <Button type="submit" label={"등록"}/>
                </div>
            </form>
        </div>
    );
}
