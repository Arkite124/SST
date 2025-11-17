import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import DailyWritingModal from "./DailyWritingModal";
import DailyWritingEditModal from "./DailyWritingEditModal";
import DailyWritingDetailModal from "./DailyWritingDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/utils/axiosInstance.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import { toast } from "react-toastify";
import { useModal } from "@/contexts/ModalContext";   // ⭐ 통합 모달 훅

export default function DailyWritingPage() {
    const [writings, setWritings] = useState([]);
    const [loading, setLoading] = useState(false);
    const { openModal, confirm } = useModal();   // ⭐ 모달 API 사용
    useAuthLoad();
    const navigate = useNavigate();

    const fetchWritings = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/activities/list/daily_writing");
            setWritings(res.data.items || []);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                toast.error("로그인이 필요합니다.", { autoClose: 2000 });
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWritings();
    }, []);

    /** -----------------------------------------------------
     *  글 상세 보기
     * ----------------------------------------------------- */
    const handleCardClick = async (id) => {
        try {
            const res = await axiosInstance.get(`/activities/list/daily_writing/${id}`);

            openModal("글 상세보기", (
                <DailyWritingDetailModal
                    writing={res.data}
                    onEdit={() => handleOpenEdit(res.data)}
                    onDelete={() => handleDelete(res.data.id)}
                />
            ));
        } catch {
            toast.error("상세 정보를 불러오지 못했습니다.", { autoClose: 2000 });
        }
    };

    /** -----------------------------------------------------
     *  모달 오픈 (작성)
     * ----------------------------------------------------- */
    const handleOpenAdd = () => {
        openModal("새 글 작성", (
            <DailyWritingModal onSubmit={handleAdd} />
        ));
    };

    /** -----------------------------------------------------
     *  모달 오픈 (수정)
     * ----------------------------------------------------- */
    const handleOpenEdit = (writing) => {
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={writing}
                onSubmit={(data) => handleEdit(writing.id, data)}
            />
        ));
    };

    /** -----------------------------------------------------
     *  글 추가
     * ----------------------------------------------------- */
    const handleAdd = async (data) => {
        try {
            await axiosInstance.post("/activities/list/daily_writing", data);
            toast.success("글이 등록되었습니다.");
            fetchWritings();
        } catch {
            toast.error("등록에 실패했습니다.");
        }
    };

    /** -----------------------------------------------------
     *  글 수정
     * ----------------------------------------------------- */
    const handleEdit = async (id, data) => {
        try {
            await axiosInstance.patch(`/activities/list/daily_writing/${id}`, data);
            toast.success("글이 수정되었습니다.");
            fetchWritings();
        } catch {
            toast.error("수정에 실패했습니다.");
        }
    };

    /** -----------------------------------------------------
     *  글 삭제 (Confirm 모달)
     * ----------------------------------------------------- */
    const handleDelete = async (id) => {
        const ok = await confirm("삭제 확인", "정말 삭제하시겠습니까?");
        if (!ok) return;

        try {
            await axiosInstance.delete(`/activities/list/daily_writing/${id}`);
            toast.success("삭제되었습니다.");
            fetchWritings();
        } catch {
            toast.error("삭제에 실패했습니다.");
        }
    };

    /** ----------------------------------------------------- */
    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleOpenAdd} label="+ 새 글 작성" />
            </div>

            {writings.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                    작성된 일기장이 없습니다.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {writings.map((writing) => (
                        <Card
                            key={writing.id}
                            onClick={() => handleCardClick(writing.id)}
                        >
                            {/* 내용 표시 */}
                            <div className="mt-3">
                                <h3 className="text-lg font-semibold line-clamp-1">
                                    {writing.title || "(제목 없음)"}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                    {writing.content || "내용 없음"}
                                </p>

                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(writing.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
