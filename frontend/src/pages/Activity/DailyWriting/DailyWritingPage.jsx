// DailyWritingPage.jsx
import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import DailyWritingModal from "./DailyWritingModal";
import DailyWritingEditModal from "./DailyWritingEditModal";
import DailyWritingDetailModal from "./DailyWritingDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useModal } from "@/contexts/ModalContext.jsx";
import { useSelector, useDispatch } from "react-redux";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import '@/css/MyCalendar.css';

import {
    fetchDailyWritings,
    addDailyWriting,
    editDailyWriting,
    deleteDailyWriting,
    setPage,
} from "@/redux/slices/dailyWritingSlice";

export default function DailyWritingPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { openModal, confirm } = useModal();

    const { items: writings = [], loading, error, total, page, size } = useSelector(
        (state) => state.dailyWriting
    );

    const [selectedDate, setSelectedDate] = useState(null);
    const [filteredWritings, setFilteredWritings] = useState(writings);

    // ---------------------------
    // Fetch writings whenever page or size changes
    // ---------------------------
    useEffect(() => {
        dispatch(fetchDailyWritings({ page, size }))
            .unwrap()
            .catch((err) => {
                if (err?.response?.status === 401) {
                    toast.error("로그인이 필요합니다.", { autoClose: 2000 });
                    navigate("/login");
                } else {
                    toast.error("글 목록을 불러오지 못했습니다.");
                }
            });
    }, [dispatch, navigate, page, size]);

    // ---------------------------
    // Filter by calendar selection
    // ---------------------------
    useEffect(() => {
        if (!selectedDate) {
            setFilteredWritings(writings);
            return;
        }

        const filtered = writings.filter((w) => {
            const writingDate = new Date(w.created_at);
            return (
                writingDate.getFullYear() === selectedDate.getFullYear() &&
                writingDate.getMonth() === selectedDate.getMonth() &&
                writingDate.getDate() === selectedDate.getDate()
            );
        });
        setFilteredWritings(filtered);
    }, [selectedDate, writings]);

    // ---------------------------
    // Handlers
    // ---------------------------
    const handleCardClick = (writing) => {
        openModal("글 상세보기", (
            <DailyWritingDetailModal
                writing={writing}
                onEdit={() => handleOpenEdit(writing)}
                onDelete={() => handleDelete(writing.id)}
            />
        ));
    };

    const handleOpenAdd = () => {
        openModal("새 글 작성", <DailyWritingModal onSubmit={handleAdd} />);
    };

    const handleOpenEdit = (writing) => {
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={writing}
                onSubmit={(data) => handleEdit(writing.id, data)}
            />
        ));
    };

    const handleAdd = async (data) => {
        try {
            await dispatch(addDailyWriting(data)).unwrap();
            toast.success("글이 등록되었습니다.");
            dispatch(fetchDailyWritings({ page, size })); // 새 글 추가 후 새로고침
        } catch {
            toast.error("등록에 실패했습니다.");
        }
    };

    const handleEdit = async (id, data) => {
        try {
            await dispatch(editDailyWriting({ id, data })).unwrap();
            toast.success("글이 수정되었습니다.");
        } catch {
            toast.error("수정에 실패했습니다.");
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm("삭제 확인", "정말 삭제하시겠습니까?");
        if (!ok) return;

        try {
            await dispatch(deleteDailyWriting(id)).unwrap();
            toast.success("삭제되었습니다.");
            dispatch(fetchDailyWritings({ page, size })); // 삭제 후 새로고침
        } catch {
            toast.error("삭제에 실패했습니다.");
        }
    };

    // ---------------------------
    // Pagination
    // ---------------------------
    const totalPages = Math.ceil(total / size);

    const handlePrevPage = () => {
        if (page > 1) dispatch(setPage(page - 1));
    };

    const handleNextPage = () => {
        if (page < totalPages) dispatch(setPage(page + 1));
    };

    // ---------------------------
    // Render
    // ---------------------------
    if (loading) return <LoadingSpinner />;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="space-y-6">
            {/* 상단: 새 글 작성 버튼 */}
            <div className="flex justify-end">
                <Button onClick={handleOpenAdd} label="+ 새 글 작성" />
            </div>

            {/* 하단: 좌측 달력, 우측 글 목록 */}
            <div className="flex gap-6 h-[40vh]">
                {/* 달력 */}
                <div className="w-80 flex-shrink-0">
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        formatDay={(locale, date) => date.getDate()}
                        className="react-calendar"
                    />
                    {selectedDate && (
                        <div className="mt-2 text-center text-gray-500 text-sm">
                            {selectedDate.toLocaleDateString()} 선택됨
                        </div>
                    )}
                </div>

                {/* 글 목록 */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {filteredWritings.length === 0 ? (
                            <p className="text-gray-500 text-center py-10">
                                작성된 일기장이 없습니다.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {filteredWritings.map((writing) => (
                                    <Card
                                        key={writing.id}
                                        onClick={() => handleCardClick(writing)}
                                    >
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

                    {/* Pagination Buttons */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <Button onClick={handlePrevPage} label="이전" disabled={page === 1} />
                            <span>{page} / {totalPages}</span>
                            <Button onClick={handleNextPage} label="다음" disabled={page === totalPages} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
