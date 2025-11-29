import { createPortal } from "react-dom";
import Button from "@/components/common/Button";
import DailyWritingEditModal from "./DailyWritingEditModal";
import { useModal } from "@/contexts/ModalContext.jsx";
import { useDispatch } from "react-redux";
import { deleteDailyWriting, editDailyWriting } from "@/redux/slices/dailyWritingSlice";
import { toast } from "react-toastify";
import { useState } from "react";

export default function DailyWritingDetailModal({ writing: initialWriting }) {
    const { closeModal, openModal, confirm } = useModal();
    const dispatch = useDispatch();

    const [writing, setWriting] = useState(initialWriting);

    const handleEdit = () => {
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={writing}
                onSubmit={async (data) => {
                    try {
                        const updated = await dispatch(editDailyWriting({ id: writing.id, data })).unwrap();
                        toast.success("글이 수정되었습니다.");

                        setWriting((prev) => ({
                            ...prev,
                            ...updated.data,
                            cleaned_content: updated.data.cleaned_content || prev.cleaned_content
                        }));

                        closeModal();
                    } catch {
                        toast.error("수정에 실패했습니다.");
                    }
                }}
            />
        ));
    };

    const handleDelete = async () => {
        const ok = await confirm("삭제 확인", "정말 삭제하시겠습니까?");
        if (!ok) return;

        try {
            await dispatch(deleteDailyWriting(writing.id)).unwrap();
            toast.success("삭제되었습니다.");
            closeModal();
        } catch {
            toast.error("삭제에 실패했습니다.");
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/30"
                onClick={closeModal}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-6 z-[100000]">
                <h3 className="text-xl font-semibold">{writing.title}</h3>
                <p className="text-sm text-gray-500">{new Date(writing.created_at).toLocaleDateString()}</p>
                <p className="whitespace-pre-line text-gray-700">{writing.content}</p>

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

                {/* ✅ cleaned_content */}
                {writing.cleaned_content && (
                    <div className="mt-4 p-4 border-t border-gray-200 text-gray-600 whitespace-pre-line">
                        {writing.cleaned_content}
                    </div>
                )}

                {/* ✅ 감정을 맨 밑으로 */}
                <p className="text-3xl pt-2">
                    감정: {["😡","😢","😐","😄","😊"][writing.mood - 1]}
                </p>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" label="닫기" onClick={closeModal} />
                    <Button variant="primary" label="수정" onClick={handleEdit} />
                    <Button variant="danger" label="삭제" onClick={handleDelete} />
                </div>
            </div>
        </div>,
        document.body
    );
}
