import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import DailyWritingModal from "./DailyWritingModal";
import DailyWritingEditModal from "./DailyWritingEditModal";
import DailyWritingDetailModal from "./DailyWritingDetailModal";
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

// 날짜 형식을 YYYY-MM-DD로 맞추기 (UTC 문제 해결)
const formatDate = (date) => {
    const offset = date.getTimezoneOffset();
    const fixed = new Date(date.getTime() - offset * 60000);
    return fixed.toISOString().split("T")[0];
};

export default function DailyWritingPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { openModal, closeModal, confirm, showLoadingModal, hideLoadingModal } = useModal();

    const { items: writings = [], loading, error, total, page, size } = useSelector(
        (state) => state.dailyWriting
    );

    const [selectedDate, setSelectedDate] = useState(null);

    // ------------------------------------------------
    // Fetch writings whenever (page, size, selectedDate) changes
    // ------------------------------------------------
    useEffect(() => {
        const dateParam = selectedDate ? formatDate(selectedDate) : null;

        dispatch(fetchDailyWritings({ page, size, selectedDate: dateParam }))
            .unwrap()
            .catch((err) => {
                if (err?.response?.status === 401) {
                    toast.error("로그인이 필요합니다.", { autoClose: 2000 });
                    navigate("/login");
                } else {
                    toast.error("글 목록을 불러오지 못했습니다.");
                }
            });
    }, [dispatch, navigate, page, size, selectedDate]);

    // ------------------------------------------------
    // Handlers
    // ------------------------------------------------

    // 글 추가 + 분석 상태 체크
    const handleAdd = async (data) => {
        try {
            // 1️⃣ 먼저 글 작성 모달 닫기
            closeModal();

            // 2️⃣ 글 등록
            const result = await dispatch(addDailyWriting(data)).unwrap();

            // 3️⃣ 로딩 모달 표시
            showLoadingModal("글 등록 완료, 분석 진행 중...");

            // 렌더링 보장
            await new Promise((resolve) => setTimeout(resolve, 50));

            // 분석 상태 폴링 (최대 60초)
            await new Promise((resolve) => {
                let elapsedTime = 0;
                const interval = setInterval(async () => {
                    elapsedTime += 2000;

                    // 타임아웃 (60초)
                    if (elapsedTime >= 60000) {
                        clearInterval(interval);
                        resolve();
                        return;
                    }

                    try {
                        const res = await fetch(`/activities/list/daily_writing/${result.id}/status`);
                        const json = await res.json();

                        if (json.status === "done") {
                            clearInterval(interval);
                            resolve();
                        }
                    } catch (err) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 2000);
            });

            // 4️⃣ 완료되면 로딩 모달 닫기
            hideLoadingModal();

            // 약간의 딜레이 후 토스트 표시 (모달이 완전히 사라진 후)
            await new Promise((resolve) => setTimeout(resolve, 100));

            toast.success("분석 완료!");
            dispatch(setPage(1));
            const dateParam = selectedDate ? formatDate(selectedDate) : null;
            dispatch(fetchDailyWritings({ page: 1, size, selectedDate: dateParam }));

        } catch (err) {
            hideLoadingModal();
            toast.error("등록에 실패했습니다.");
        }
    };

    const handleOpenAdd = () => {
        openModal("새 글 작성", <DailyWritingModal onSubmit={handleAdd} />);
    };

    const handleCardClick = (writing) => {
        if (!writing || !writing.id) {
            toast.error("글 정보를 불러올 수 없습니다.");
            return;
        }
        openModal("글 상세보기", (
            <DailyWritingDetailModal
                id={writing.id}
                onEdit={() => handleOpenEdit(writing.id)}
                onDelete={() => handleDelete(writing.id)}
            />
        ));
    };

    const handleOpenEdit = (id) => {
        const writing = writings.find(w => w.id === id);
        if (!writing) return toast.error("글 정보가 없습니다.");
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={{ ...writing }}
                onSubmit={(data) => handleEdit(id, data)}
            />
        ));
    };

    const handleEdit = async (id, data) => {
        try {
            await dispatch(editDailyWriting({ id, data })).unwrap();
            toast.success("글이 수정되었습니다.");

            const dateParam = selectedDate ? formatDate(selectedDate) : null;
            dispatch(fetchDailyWritings({ page, size, selectedDate: dateParam }));
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

            const dateParam = selectedDate ? formatDate(selectedDate) : null;
            dispatch(fetchDailyWritings({ page, size, selectedDate: dateParam }));
        } catch {
            toast.error("삭제에 실패했습니다.");
        }
    };

    // ------------------------------------------------
    // Pagination
    // ------------------------------------------------
    const totalPages = Math.ceil(total / size);

    const handlePrevPage = () => {
        if (page > 1) dispatch(setPage(page - 1));
    };

    const handleNextPage = () => {
        if (page < totalPages) dispatch(setPage(page + 1));
    };

    // ------------------------------------------------
    // 전체보기 버튼
    // ------------------------------------------------
    const handleShowAll = () => {
        setSelectedDate(null);
        dispatch(setPage(1));
    };

    // ------------------------------------------------
    // 달력 선택 시 페이지 1로 초기화
    // ------------------------------------------------
    const handleDateChange = (date) => {
        setSelectedDate(date);
        dispatch(setPage(1));
    };

    // ------------------------------------------------
    // Render
    // ------------------------------------------------
    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <Button onClick={handleShowAll} label="전체보기" />
                <Button onClick={handleOpenAdd} label="+ 새 글 작성" />
            </div>

            <div className="flex gap-6 h-[40vh]">
                {/* 달력 */}
                <div className="w-80 flex-shrink-0">
                    <Calendar
                        onChange={handleDateChange}
                        value={selectedDate}
                        formatDay={(l, date) => date.getDate()}
                        className="react-calendar"
                    />
                    {selectedDate && (
                        <div className="mt-2 text-center text-gray-500 text-sm">
                            {selectedDate.toLocaleDateString()} 선택됨
                        </div>
                    )}
                </div>

                {/* 카드 목록 */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {writings.length === 0 ? (
                            <p className="text-gray-500 text-center py-10">
                                작성된 일기장이 없습니다.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {writings.map((writing) => (
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