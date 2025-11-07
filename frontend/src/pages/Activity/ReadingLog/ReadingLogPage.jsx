import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Modal from "@/components/common/Modal";
import ReadingLogModal from "./ReadingLogModal";
import ReadingLogEditModal from "./ReadingLogEditModal";
import ReadingLogDetailModal from "./ReadingLogDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/utils/axiosInstance.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import {toast} from "react-toastify";

export default function ReadingLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    useAuthLoad();
    const navigate = useNavigate();
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/activities/list/reading_logs");
            setLogs(res.data.items || []);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                toast.error("이용하려면 로그인 해주세요.",{autoClose:2000});
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);
    const handleCardClick = async (logId) => {
        try {
            const res = await axiosInstance.get(`/activities/list/reading_logs/${logId}`);
            setSelectedLog(res.data);
            setShowDetailModal(true);
        } catch (err) {
            toast.error("상세정보를 불러오지 못했습니다.",{autoClose:2000});

        }
    };
    const handleAdd = async (data) => {
        try {
            await axiosInstance.post("/activities/list/reading_logs", data);
            setToast({ type: "success", message: "독서록이 등록되었습니다." })
            setShowAddModal(false);
            fetchLogs();
        } catch (err) {
            console.error(err);
            setToast({ type: "error", message: "등록에 실패했습니다." });
        }
    };

    const handleEdit = async (id, data) => {
        try {
            await axiosInstance.patch(`/activities/list/reading_logs/${id}`, data);
            setToast({ type: "success", message: "독서록이 수정되었습니다." });
            setShowEditModal(false);
            fetchLogs();
        } catch {
            setToast({ type: "error", message: "수정에 실패했습니다." });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axiosInstance.delete(`/activities/list/reading_logs/${id}`);
            setToast({ type: "success", message: "삭제 완료!" });
            fetchLogs();
        } catch {
            setToast({ type: "error", message: "삭제에 실패했습니다." });
        }
    };

    if (loading) return <LoadingSpinner />;
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => {
                    setShowAddModal(true)}} label="+ 새 독서록 작성"></Button>
            </div>

            {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-10">등록된 독서록이 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {logs.map((log) => (
                        <Card
                            key={log.id}
                            onClick={() => {
                                handleCardClick(log.id);
                                setSelectedLog(log);
                                setShowDetailModal(true);
                            }}
                        >
                            {/* ✅ 책 이미지 */}
                            <img
                                src={log.image || "/default_book_cartoon.png"}
                                alt={log.book_title || "기본 책 이미지"}
                                className="w-full h-[20rem] object-cover rounded-md"
                            />

                            {/* ✅ 책 정보 */}
                            <div className="mt-3">
                                <h3 className="text-lg font-semibold">{log.book_title}</h3>
                                <p className="text-sm text-gray-600">
                                    {log.author ? log.author : ""}
                                    {log.author && log.publisher ? " · " : ""}
                                    {log.publisher ? log.publisher : ""}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {new Date(log.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            {/* ✅ 독서록 요약 */}
                            <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                                {log.content || "작성된 내용이 없습니다."}
                            </p>

                            {/* ✅ 네이버 링크 */}
                            {log.link && (
                                <a
                                    href={log.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm mt-2 hover:underline block"
                                    onClick={(e) => e.stopPropagation()} // 카드 클릭과 분리
                                >
                                    네이버 책 상세보기 →
                                </a>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* 모달들 */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
                <ReadingLogModal onSubmit={handleAdd} onClose={() => setShowAddModal(false)} />
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
                <ReadingLogEditModal
                    log={selectedLog}
                    onSubmit={(data) => handleEdit(selectedLog.id, data)}
                    onClose={() => setShowEditModal(false)}
                />
            </Modal>
            <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}>
                <ReadingLogDetailModal
                    log={selectedLog}
                    onEdit={() => {
                        setShowEditModal(true);
                        setShowDetailModal(false);
                    }}
                    onDelete={() => handleDelete(selectedLog.id)}
                />
            </Modal>
        </div>
    );
}
