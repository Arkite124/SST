// src/pages/Activity/DailyWriting/DailyWritingDetailModal.jsx
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";

export default function DailyWritingDetailModal({ writing, onEdit, onDelete }) {
    const { closeModal } = useModal();

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">

            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={closeModal}
            />

            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 z-[10000] space-y-6">

                {/* 제목 */}
                <h3 className="text-xl font-semibold">{writing.title}</h3>

                {/* 날짜 */}
                <p className="text-sm text-gray-500">
                    {new Date(writing.created_at).toLocaleDateString()}
                </p>

                {/* 내용 */}
                <p className="whitespace-pre-line text-gray-700">
                    {writing.content}
                </p>

                {/* 감정 */}
                <p className="text-3xl pt-2">
                    감정: {["😡","😢","😐","😄","😊"][writing.mood - 1]}
                </p>

                {/* 링크 */}
                {writing.attachment_url && (
                    <a
                        href={writing.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline block"
                    >
                        참고 링크 열기 →
                    </a>
                )}

                {/* 버튼 */}
                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        variant="secondary"
                        label="닫기"
                        onClick={closeModal}
                    />

                    <Button
                        variant="primary"
                        label="수정"
                        onClick={() => {
                            closeModal();
                            onEdit();   // DailyWritingPage에서 openModal 실행
                        }}
                    />

                    <Button
                        variant="danger"
                        label="삭제"
                        onClick={() => {
                            onDelete(writing.id);
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
