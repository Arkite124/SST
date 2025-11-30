import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import DailyWritingEditModal from "./DailyWritingEditModal";
import { useModal } from "@/contexts/ModalContext.jsx";
import { useDispatch, useSelector } from "react-redux";
import { deleteDailyWriting, editDailyWriting, fetchDailyWritings } from "@/redux/slices/dailyWritingSlice";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/axiosInstance";

export default function DailyWritingDetailModal({ id }) {
    const { closeModal, openModal, confirm } = useModal();
    const dispatch = useDispatch();
    const page = useSelector(state => state.dailyWriting.page);
    const size = useSelector(state => state.dailyWriting.size);

    const [writing, setWriting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // API로 직접 글 상세 정보 가져오기
    useEffect(() => {
        const fetchWriting = async () => {
            try {
                console.log("📖 Fetching writing detail for ID:", id);
                const res = await axiosInstance.get(`/activities/list/daily_writing/${id}`);
                console.log("✅ Writing detail loaded:", res.data);
                setWriting(res.data);
                setLoading(false);
            } catch (error) {
                console.error("❌ Failed to load writing:", error);
                toast.error("글을 불러올 수 없습니다.");
                setLoading(false);
            }
        };

        if (id) {
            fetchWriting();
        }
    }, [id]);

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" onClick={closeModal}></div>
                <div className="relative bg-white rounded-2xl shadow-xl p-6 z-[100000]">
                    <p>로딩 중...</p>
                </div>
            </div>,
            document.body
        );
    }

    if (!writing) {
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" onClick={closeModal}></div>
                <div className="relative bg-white rounded-2xl shadow-xl p-6 z-[100000]">
                    <p className="text-red-500">글 정보를 불러올 수 없습니다. (ID: {id})</p>
                    <Button onClick={closeModal} label="닫기" className="mt-4" />
                </div>
            </div>,
            document.body
        );
    }

    const handleEdit = () => {
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={{ ...writing }}
                onSubmit={async (data) => {
                    try {
                        console.log("Editing writing ID:", writing.id, "with data:", data);
                        await dispatch(editDailyWriting({ id: writing.id, data })).unwrap();
                        toast.success("글이 수정되었습니다.");

                        // Redux state 새로고침
                        await dispatch(fetchDailyWritings({ page, size }));

                        closeModal();
                    } catch (error) {
                        console.error("수정 오류:", error);
                        toast.error(error?.message || "수정에 실패했습니다.");
                    }
                }}
            />
        ));
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            console.log("Deleting writing ID:", writing.id);
            await dispatch(deleteDailyWriting(writing.id)).unwrap();
            toast.success("삭제되었습니다.");
            closeModal();
        } catch (error) {
            console.error("삭제 오류:", error);
            toast.error(error?.message || "삭제에 실패했습니다.");
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" onClick={closeModal}></div>
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-6 z-[100000]">
                    <div className="text-xs text-gray-400 mb-2">ID: {writing.id}</div>
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

                    {writing.cleaned_content && (
                        <div className="mt-4 p-4 border-t border-gray-200 text-gray-600 whitespace-pre-line">
                            {writing.cleaned_content}
                        </div>
                    )}

                    <p className="text-3xl pt-2">
                        감정: {["😡","😢","😐","😄","😊"][writing.mood - 1] || "😐"}
                    </p>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" label="닫기" onClick={closeModal} />
                        <Button variant="primary" label="수정" onClick={handleEdit} />
                        <Button variant="danger" label="삭제" onClick={handleDelete} />
                    </div>
                </div>
            </div>

            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 z-[100002]">
                        <h3 className="text-lg font-semibold mb-2">삭제 확인</h3>
                        <p className="text-gray-600 mb-6">정말 삭제하시겠습니까?</p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                label="취소"
                                onClick={() => setShowDeleteConfirm(false)}
                            />
                            <Button
                                variant="danger"
                                label="삭제"
                                onClick={confirmDelete}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}