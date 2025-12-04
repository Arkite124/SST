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
    const { closeModal, openModal } = useModal();
    const [showAllWords, setShowAllWords] = useState(false);

    const dispatch = useDispatch();
    const page = useSelector(state => state.dailyWriting.page);
    const size = useSelector(state => state.dailyWriting.size);

    const [writing, setWriting] = useState(null);
    const [outputs, setOutputs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysisStatus, setAnalysisStatus] = useState("processing");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 📌 글 상세 정보 가져오기
    useEffect(() => {
        const fetchWriting = async () => {
            try {
                const res = await axiosInstance.get(`/activities/list/daily_writing/${id}`);
                setWriting(res.data);
                setLoading(false);
            } catch (error) {
                console.error("❌ Failed to load writing:", error);
                toast.error("글을 불러올 수 없습니다.");
                setLoading(false);
            }
        };

        if (id) fetchWriting();
    }, [id]);

    // 📌 분석 상태 폴링
    useEffect(() => {
        if (!id) return;

        let interval;
        const fetchStatus = async () => {
            try {
                const res = await axiosInstance.get(`/activities/list/daily_writing/${id}/status`);
                setAnalysisStatus(res.data.status);

                if (res.data.status === "done") {
                    clearInterval(interval);
                    // 분석 결과 가져오기
                    const outputsRes = await axiosInstance.get(`/activities/list/daily_writing/${id}/outputs`);
                    setOutputs(outputsRes.data);
                }
            } catch (err) {
                console.error("Failed to fetch analysis status:", err);
            }
        };

        fetchStatus();
        interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
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

    // 분석 완료 시 outputs 데이터를 사용, 아니면 writing 데이터를 fallback
    const displayWordsList = outputs?.words_list || writing.words_list;
    const topNoun = outputs?.top_noun || writing.top_noun;
    const topVerb = outputs?.top_verb || writing.top_verb;
    const topAdj = outputs?.top_adjective || writing.top_adjective;

    const findWordInfo = (word) => {
        if (!displayWordsList) return null;
        return displayWordsList.find(
            (w) => w.base_word === word || w.word === word
        );
    };

    const nounInfo = findWordInfo(topNoun);
    const verbInfo = findWordInfo(topVerb);
    const adjInfo = findWordInfo(topAdj);

    // ✏ 수정
    const handleEdit = () => {
        openModal("글 수정", (
            <DailyWritingEditModal
                writing={{ ...writing }}
                onSubmit={async (data) => {
                    try {
                        await dispatch(editDailyWriting({ id: writing.id, data })).unwrap();
                        toast.success("글이 수정되었습니다.");

                        await dispatch(fetchDailyWritings({ page, size }));
                        closeModal();
                    } catch (error) {
                        toast.error(error?.message || "수정에 실패했습니다.");
                    }
                }}
            />
        ));
    };

    // 🗑 삭제
    const confirmDelete = async () => {
        try {
            await dispatch(deleteDailyWriting(writing.id)).unwrap();
            toast.success("삭제되었습니다.");
            closeModal();
        } catch (error) {
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
                    <p className="text-sm text-gray-500">
                        {new Date(writing.created_at).toLocaleDateString()}
                    </p>

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

                    <p className="text-3xl pt-2">
                        감정: {["😡","😢","😐","😄","😊"][writing.mood - 1] || "😐"}
                    </p>

                    {/* ---------------------------- */}
                    {/* 분석 상태 표시 */}
                    {analysisStatus === "processing" && (
                        <div className="bg-yellow-50 p-3 rounded-lg border text-sm text-gray-700">
                            🕒 분석 중...
                        </div>
                    )}

                    {analysisStatus === "done" && (topNoun || topVerb || topAdj) && (
                        <div className="bg-gray-50 p-3 rounded-lg border">
                            <h3 className="font-semibold mb-2">가장 많이 사용한 단어</h3>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <b>명사:</b> {topNoun || "없음"}
                                    {nounInfo && (
                                        <div className="text-gray-600 mt-1">
                                            <b>뜻:</b> {nounInfo.definition}
                                            {nounInfo.similar_words?.length > 0 && (
                                                <div className="mt-2">
                                                    <b>비슷한 단어</b>
                                                    <div className="ml-2 mt-1 space-y-1">
                                                        {nounInfo.similar_words.slice(0, 3).map((s, i) => (
                                                            <div key={i}>
                                                                {s.word}: {s.definition}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                                <li>
                                    <b>동사:</b> {topVerb || "없음"}
                                    {verbInfo && (
                                        <div className="text-gray-600 mt-1">
                                            <b>뜻:</b> {verbInfo.definition}
                                            {verbInfo.similar_words?.length > 0 && (
                                                <div className="mt-2">
                                                    <b>비슷한 단어</b>
                                                    <div className="ml-2 mt-1 space-y-1">
                                                        {verbInfo.similar_words.slice(0, 3).map((s, i) => (
                                                            <div key={i}>
                                                                {s.word}: {s.definition}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                                <li>
                                    <b>형용사:</b> {topAdj || "없음"}
                                    {adjInfo && (
                                        <div className="text-gray-600 mt-1">
                                            <b>뜻:</b> {adjInfo.definition}
                                            {adjInfo.similar_words?.length > 0 && (
                                                <div className="mt-2">
                                                    <b>비슷한 단어</b>
                                                    <div className="ml-2 mt-1 space-y-1">
                                                        {adjInfo.similar_words.slice(0, 3).map((s, i) => (
                                                            <div key={i}>
                                                                {s.word}: {s.definition}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            </ul>

                            <button
                                className="text-blue-500 underline text-sm mt-2"
                                onClick={() => setShowAllWords(!showAllWords)}
                            >
                                {showAllWords ? "닫기" : "전체 단어 보기"}
                            </button>
                        </div>
                    )}

                    {showAllWords && displayWordsList?.length > 0 && (
                        <div className="text-sm bg-white p-3 rounded-lg border max-h-60 overflow-y-auto space-y-3 mt-2">
                            {displayWordsList.map((w, idx) => (
                                <div key={idx} className="pb-2 border-b last:border-none">
                                    <div className="font-medium">
                                        {w.base_word || w.word} — {w.freq || w.count}회{" "}
                                        {w.pos && <span className="text-gray-500">({w.pos})</span>}
                                    </div>
                                    {w.definition && (
                                        <div className="text-gray-600 mt-1">
                                            <b>뜻:</b> {w.definition}
                                        </div>
                                    )}
                                    {w.similar_words?.length > 0 && (
                                        <div className="text-gray-600 mt-2">
                                            <b>비슷한 단어</b>
                                            <div className="ml-2 mt-1 space-y-1">
                                                {w.similar_words.slice(0, 3).map((s, i) => (
                                                    <div key={i}>
                                                        {s.word}: {s.definition}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" label="닫기" onClick={closeModal} />
                        <Button variant="primary" label="수정" onClick={handleEdit} />
                        <Button variant="danger" label="삭제" onClick={() => setShowDeleteConfirm(true)} />
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