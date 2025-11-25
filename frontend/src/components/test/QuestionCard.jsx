import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { stopAudio, startAudio } from "@/redux/slices/audioSlice";
import speaker from "@/assets/speaker.png"
import LoadingSpinner from "@/components/common/LoadingSpinner";
const QuestionCard = ({
                          questionData,
                          currentIndex,
                          testType,
                          onAnswer,
                          disabled, // ✅ 부모로부터 받은 disabled 상태
                      }) => {
    const dispatch = useDispatch();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const isPlaying = useSelector((state) => state.audio.isPlaying);
    const audioRef = useRef(null);

    useEffect(() => {
        // ✅ 문제 변경 시 선택 초기화 + 오디오 정지
        setSelectedIndex(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        dispatch(stopAudio());
    }, [questionData, dispatch]);

    const handleChoice = (idx) => {
        // ✅ disabled 상태면 선택 불가
        if (disabled) return;

        setSelectedIndex(idx);

        // ✅ 부모 컴포넌트의 handleAnswer 호출
        if (onAnswer) {
            onAnswer(idx);
        }
    };

    const handlePlayTTS = async (text, e) => {
        if (e) e.stopPropagation();
        if (!text) return;

        // 이전 오디오 정지
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        try {
            const res = await fetch(
                `http://localhost:8000/test/tts?text=${encodeURIComponent(text)}`
            );
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                dispatch(stopAudio());
            };

            await audio.play();
            dispatch(startAudio(text));
        } catch (err) {
            console.error("TTS 재생 실패:", err);
        }
    };

    if (!questionData) {
        return (
            <div className="flex flex-col justify-center items-center my-10">
                <LoadingSpinner message="문제 불러오는 중" />
            </div>
        );
    }

    return (
        <div
            className="question-card"
            style={{ background: "rgba(255, 255, 255, 0.9)", border: "1px solid #ddd", padding: "30px", borderRadius: "8px", width: "100%" }}
        >
            {/* 문단 + 질문 */}
            <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column"}}>
                {(questionData.paragraph || questionData.blank_sentence) && (
                    <div style={{
                        textAlign: "left",
                        margin: "15px auto",
                        fontSize: "17px",
                        whiteSpace: "pre-line",
                        background: "white",
                        border: "5px dashed #658C58",
                        borderRadius: "5px",
                        padding: "15px",
                        width: "90%",
                        textAlignLast: "left",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                    }}>
                        <span style={{ flex: 1, whiteSpace: "pre-line" }}>
                            {questionData.paragraph
                                ? questionData.paragraph
                                : questionData.blank_sentence}
                        </span>
                        <img
                            src = {speaker}
                            style={{
                                display: "inline",
                                margin: "8px",
                                cursor: isPlaying ? "not-allowed" : "pointer",
                                color: "#007bff",
                                fontSize: "22px",
                                verticalAlign: "middle",
                                width: "30px",
                                height: "30px",
                                alignSelf: "flex-start"
                            }}
                            onClick={(e) =>
                                handlePlayTTS(
                                    questionData.paragraph || questionData.blank_sentence,
                                    e
                                )}
                            title="문단 듣기"
                        />
                    </div>
                )}
                {questionData.question && (
                    <div style={{ fontWeight: "bold" ,fontSize: "18px", whiteSpace: "pre-line", margin: "8px 18px" }}>
                        {questionData.question}
                        <img
                            src = {speaker}
                            style={{
                                display: "inline",
                                marginLeft: "6px",
                                cursor: isPlaying ? "not-allowed" : "pointer",
                                color: "#007bff",
                                fontSize: "22px",
                                verticalAlign: "middle",
                                width: "30px",
                                height: "30px",
                            }}
                            onClick={(e) => handlePlayTTS(questionData.question, e)}
                            title="질문 듣기"
                        />
                    </div>
                )}
            </div>

            {/* 선택지 */}
            <ul style={{ listStyle: "none", padding: 0 }}>
                {(questionData?.choices || []).map((choice, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isCorrect = questionData?.correct_index === idx;

                    let bg = "#f0f0f0";
                    let textColor = "black";

                    // ✅ 답변 완료 후 색상 처리
                    if (disabled && selectedIndex !== null) {
                        if (isSelected && isCorrect) {
                            bg = "#4caf50"; // 정답 선택
                            textColor = "white";
                        } else if (isSelected && !isCorrect) {
                            bg = "#f44336"; // 오답 선택
                            textColor = "white";
                        } else if (!isSelected && isCorrect) {
                            bg = "#4caf50"; // 정답 표시
                            textColor = "white";
                        }
                    } else if (isSelected) {
                        bg = "#007bff"; // 선택 중
                        textColor = "white";
                    }

                    return (
                        <li key={idx} style={{ width: "90%", margin: "8px auto", display: "flex", alignItems: "center" }}>
                            <button
                                style={{
                                    flexGrow: 1,
                                    padding: "8px 18px",
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    backgroundColor: isSelected ? "#aaa" : "#DAE2B6",
                                    color: textColor,
                                    border: isSelected ? "2px solid #BBC863" : "none",
                                    borderRadius: "15px",
                                    textAlign: "left",
                                    fontWeight: isSelected ? "bold" : "normal",
                                }}
                                onClick={() => handleChoice(idx)}
                                disabled={disabled}
                            >
                                {choice}
                            </button>

                            <img
                                src = {speaker}
                                style={{
                                    display: "inline",
                                    marginLeft: "6px",
                                    cursor: isPlaying ? "not-allowed" : "pointer",
                                    color: "#007bff",
                                    fontSize: "22px",
                                    verticalAlign: "middle",
                                    width: "30px",
                                    height: "30px",
                                }}
                                onClick={(e) => handlePlayTTS(choice, e)}
                                title="보기 듣기"
                            />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default QuestionCard;