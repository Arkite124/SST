import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import DailyWritingModal from "./DailyWritingModal";
import DailyWritingEditModal from "./DailyWritingEditModal";
import DailyWritingDetailModal from "./DailyWritingDetailModal";
import { useNavigate } from "react-router-dom";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";

export default function DailyWritingPage() {
    const [writings, setWritings] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const navigate = useNavigate();
    useAuthLoad()
    const fetchWritings = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/activities/list/daily_writing",{headers: { "Content-Type": "application/json" }});
            setWritings(res.data.items || []);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWritings();
    }, []);

    const handleAdd = async (data) => {
        try {
            await axiosInstance.post("/activities/list/daily_writing", data,{headers: { "Content-Type": "application/json" }});
            setToast({ type: "success", message: "일기가 등록되었습니다!" });
            setShowAdd(false);
            fetchWritings();
        } catch {
            setToast({ type: "error", message: "등록 실패 😢" });
        }
    };

    const handleEdit = async (id, data) => {
        try {
            await axiosInstance.put(`/activities/list/daily_writing/${id}`, data,{headers: { "Content-Type": "application/json" }});
            setToast({ type: "success", message: "수정 완료!" });
            setShowEdit(false);
            fetchWritings();
        } catch {
            setToast({ type: "error", message: "수정 실패 😞" });
        }
    };
    const handleDelete = async (id) => {
        if (!window.confirm("삭제하시겠습니까?")) return;
        try {
            await axiosInstance.delete(`/activities/list/daily_writing/${id}`);
            setToast({ type: "success", message: "삭제 완료!" });
            fetchWritings();
        } catch {
            setToast({ type: "error", message: "삭제 실패!" });
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => {setShowAdd(true)}} label="+오늘의 일기 쓰기"></Button>
            </div>

            {writings.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                    아직 작성된 일기가 없습니다 🌿
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {writings.map((item) => {
                        // ✅ 감정 숫자 → 이모티콘 변환
                        const moodEmoji = {
                            5: "😊",
                            4: "😄",
                            3: "😐",
                            2: "😢",
                            1: "😡",
                        }[item.mood] || "🙂";

                        // ✅ 날짜 포맷 (MM월 DD일)
                        const formatDate = (isoString) => {
                            if (!isoString) return "날짜 없음";
                            const safeIso = isoString.endsWith("Z") ? isoString : `${isoString}Z`;
                            const date = new Date(safeIso);
                            const month = date.getMonth() + 1;
                            const day = date.getDate();
                            return `${month}월 ${day}일의 일기`;
                        };

                        return (
                            <Card
                                key={item.id}
                                onClick={() => {
                                    setSelected(item);
                                    setShowDetail(true);
                                }}
                            >
                                {/* ✅ 제목 */}
                                <h3 className="text-base font-semibold text-gray-800 mb-1">
                                    {formatDate(item.created_at) || "날짜 없음"}
                                </h3>
                                <h3 className="text-base font-semibold text-gray-800 mb-1">
                                    {item.title || "제목 없음"}
                                </h3>

                                {/* ✅ 내용 */}
                                <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                                    {item.content || "내용이 없습니다."}
                                </p>

                                {/* ✅ 감정 */}
                                <p className="text-right text-xl">{moodEmoji}</p>
                            </Card>
                        );
                    })}
                </div>
            )}


            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <DailyWritingModal onSubmit={handleAdd} onClose={() => setShowAdd(false)} />
            </Modal>

            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)}>
                <DailyWritingEditModal
                    writing={selected}
                    onSubmit={(data) => handleEdit(selected.id, data)}
                    onClose={() => setShowEdit(false)}
                />
            </Modal>

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)}>
                <DailyWritingDetailModal
                    writing={selected}
                    onEdit={() => {
                        setShowEdit(true);
                        setShowDetail(false);
                    }}
                    onDelete={() => handleDelete(selected.id)}
                />
            </Modal>

            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
