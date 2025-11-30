import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ReadingLogModal from "./ReadingLogModal";
import ReadingLogEditModal from "./ReadingLogEditModal";
import ReadingLogDetailModal from "./ReadingLogDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/utils/axiosInstance.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import { toast } from "react-toastify";
import { useModal } from "@/contexts/ModalContext";

export default function ReadingLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const { openModal, confirm } = useModal(); // ⭐ 통합 모달
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
                toast.error("이용하려면 로그인 해주세요.", { autoClose: 2000 });
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    /** ----------------------------
     * 상세 모달
     ----------------------------- */
    const handleCardClick = async (logId) => {
        try {
            const res = await axiosInstance.get(`/activities/list/reading_logs/${logId}`);
            const log = res.data;

            openModal("독서록 상세 보기", (
                <ReadingLogDetailModal
                    log={log}
                    onEdit={() => handleOpenEdit(log)}
                    onDelete={() => handleDelete(log.id)}
                />
            ));
        } catch {
            toast.error("상세정보를 불러오지 못했습니다.", { autoClose: 2000 });
        }
    };

    /** ----------------------------
     * 등록
     ----------------------------- */
    const handleOpenAdd = () => {
        openModal("새 독서록 작성", (
            <ReadingLogModal onSubmit={handleAdd} />
        ));
    };

    const handleAdd = async (data) => {
        try {
            await axiosInstance.post("/activities/list/reading_logs", data);
            toast.success("독서록이 등록되었습니다.");
            fetchLogs();
        } catch (err) {
            console.error(err);
            toast.error("등록에 실패했습니다.");
        }
    };

    /** ----------------------------
     * 수정
     ----------------------------- */
    const handleOpenEdit = (log) => {
        openModal("독서록 수정", (
            <ReadingLogEditModal
                log={log}
                onSubmit={(data) => handleEdit(log.id, data)}
            />
        ));
    };

    const handleEdit = async (id, data) => {
        try {
            await axiosInstance.patch(`/activities/list/reading_logs/${id}`, data);
            toast.success("독서록이 수정되었습니다.");
            fetchLogs();
        } catch {
            toast.error("수정에 실패했습니다.");
        }
    };

    /** ----------------------------
     * 삭제 (confirm 사용)
     ----------------------------- */
    const handleDelete = async (id) => {
        const ok = await confirm("삭제 확인", "정말 삭제하시겠습니까?");
        if (!ok) return;

        try {
            await axiosInstance.delete(`/activities/list/reading_logs/${id}`);
            toast.success("삭제 완료!");
            fetchLogs();
        } catch {
            toast.error("삭제에 실패했습니다.");
        }
    };

    /** ---------------------------- */
    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleOpenAdd} label="+ 새 독서록 작성" />
            </div>

            {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                    등록된 독서록이 없습니다.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {logs.map((log) => (
                        <Card key={log.id} onClick={() => handleCardClick(log.id)}>
                            {/* 이미지 */}
                            <img
                                src={log.image || "/default_book_cartoon.png"}
                                alt={log.book_title}
                                className="w-full h-[20rem] object-cover rounded-md"
                            />

                            {/* 책 정보 */}
                            <div className="mt-3">
                                <h3 className="text-lg font-semibold">{log.book_title}</h3>

                                <p className="text-sm text-gray-600">
                                    {log.author}
                                    {log.author && log.publisher ? " · " : ""}
                                    {log.publisher}
                                </p>

                                <p className="text-xs text-gray-400">
                                    {new Date(log.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            {/* 요약 */}
                            <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                                {log.content || "작성된 내용이 없습니다."}
                            </p>

                            {/* 네이버 링크 */}
                            {log.link && (
                                <a
                                    href={log.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm mt-2 hover:underline block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    네이버 책 상세보기 →
                                </a>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
