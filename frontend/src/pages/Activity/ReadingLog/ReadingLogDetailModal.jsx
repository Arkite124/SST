// ReadingLogDetailModal.jsx
import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import { useModal } from "@/contexts/ModalContext";
import useCheckUser from "@/hooks/useCheckUser.jsx";

export default function ReadingLogDetailModal({ log, onEdit, onDelete }) {
    useCheckUser();
    const { closeModal } = useModal();
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={closeModal}
            />

            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 z-[10000]">
                <h3 className="text-xl font-semibold">{log.book_title}</h3>
                {log.image && (
                    <img
                        src={log.image}
                        alt={log.book_title}
                        className="w-full max-h-60 h-auto object-contain rounded-md my-4"
                    />
                )}
                <p className="text-sm text-gray-600">
                    {log.author}
                    {log.author && log.publisher ? " · " : ""}
                    {log.publisher}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                    {new Date(log.created_at).toLocaleDateString()}
                </p>
                <p className="whitespace-pre-line text-gray-700 mb-4">{log.content}</p>

                {/* 어려웠던 문장 */}
                {log.unknown_sentence && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg border-l-4 border-[#4E944F]">
                        <h4 className="font-medium text-gray-800 mb-1">어려웠던 문장</h4>
                        <p className="text-gray-700 whitespace-pre-line">{log.unknown_sentence}</p>
                    </div>
                )}

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
        </div>,
        document.body
    );
}
