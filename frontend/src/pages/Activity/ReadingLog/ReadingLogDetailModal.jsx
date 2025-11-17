// src/pages/Activity/ReadingLog/ReadingLogDetailModal.jsx
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function ReadingLogDetailModal({ log, onEdit, onDelete }) {
    const { closeModal } = useModal();

    return (
        <div className="space-y-6">
            {/* 제목 */}
            <h3 className="text-xl font-semibold">{log.book_title}</h3>

            {/* 이미지 */}
            {log.image && (
                <img
                    src={log.image}
                    alt={log.book_title}
                    className="w-full h-60 object-cover rounded-md"
                />
            )}

            {/* 저자 · 출판사 */}
            <p className="text-sm text-gray-600">
                {log.author}
                {log.author && log.publisher ? " · " : ""}
                {log.publisher}
            </p>

            {/* 날짜 */}
            <p className="text-xs text-gray-400">
                {new Date(log.created_at).toLocaleDateString()}
            </p>

            {/* 내용 */}
            <p className="whitespace-pre-line text-gray-700">{log.content}</p>

            {/* 링크 */}
            {log.link && (
                <a
                    href={log.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline block mt-2"
                >
                    네이버 책 상세보기 →
                </a>
            )}

            {/* 버튼 */}
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" label="닫기" onClick={closeModal} />

                <Button
                    variant="primary"
                    label="수정"
                    onClick={() => {
                        closeModal();
                        onEdit();
                    }}
                />

                <Button
                    variant="danger"
                    label="삭제"
                    onClick={() => onDelete(log.id)}
                />
            </div>
        </div>
    );
}
