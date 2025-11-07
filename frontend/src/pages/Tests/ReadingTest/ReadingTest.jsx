import React, { useEffect, useRef, useState } from "react";
import QuestionCard from "@/components/test/QuestionCard";
import { useDispatch, useSelector } from "react-redux";
import { playTTS, stopAudio } from "@/redux/slices/audioSlice";
import { endGame, resetTest, submitAnswer as submitAnswerAction, nextQuestion } from "@/redux/slices/ReadingSlice.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import { readingApi } from "@/utils/readingApi";

const MAX_QUESTIONS = 10;

const ReadingTest = () => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const { questions, currentQuestionIndex, questionHistory, finished, loading, feedback } = useSelector((state) => state.reading);

    const currentQuestion = questions[currentQuestionIndex];
    const questionCount = currentQuestionIndex + 1;
    const correctCount = questionHistory.filter(q => q.isCorrect).length;

    const hasFetchedRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAnswered, setHasAnswered] = useState(false); // ✅ 답변 완료 상태

    useAuthLoad();

    // 🔹 게임 시작 - readingApi 기반
    useEffect(() => {
        if (!hasFetchedRef.current && user?.id) {
            hasFetchedRef.current = true;
            (async () => {
                const data = await readingApi.startGame(user.id, MAX_QUESTIONS, user.vocabulary_age);
                dispatch(resetTest());
                dispatch({
                    type: "reading/fetchQuestions/fulfilled",
                    payload: data.questions
                });
            })();
        }
    }, [user, dispatch]);

    // ✅ 문제가 바뀔 때마다 hasAnswered 초기화
    useEffect(() => {
        setHasAnswered(false);
    }, [currentQuestionIndex]);

    const submittingRef = useRef(false);

    // 🔹 답안 제출
    const handleAnswer = async (choiceIndex) => {
        if (submittingRef.current || hasAnswered || !currentQuestion) return;

        submittingRef.current = true;
        try {
            const result = await readingApi.submitAnswer(user.id, currentQuestion, choiceIndex);

            dispatch(submitAnswerAction({
                userId: user.id,
                questionData: currentQuestion,
                userChoiceIndex: choiceIndex,
                correct: result.correct,
                correct_answer: result.correct_answer,
                user_answer: result.user_answer
            }));

            setHasAnswered(true); // ✅ 답변 완료 표시
        } finally {
            submittingRef.current = false;
        }
    };

    // 🔹 다음 문제
    const handleNextQuestion = () => {
        dispatch(stopAudio());
        setHasAnswered(false); // ✅ 다음 문제로 넘어가면서 초기화

        if (currentQuestionIndex + 1 < questions.length) {
            dispatch(nextQuestion());
        } else {
            handleGameEnd();
        }
    };

    // 🔹 게임 종료
    const handleGameEnd = async () => {
        if (!user?.id || questionHistory.length === 0) return;

        // Redux state에서 questionHistory 전달
        await dispatch(
            endGame({
                userId: user.id,
                questionHistory,
                testType: "reading" // 항상 명시
            })
        ).unwrap();
    };

    // 🔹 게임 재시작
    const handleRestart = () => {
        dispatch(resetTest());
        hasFetchedRef.current = false;
        setIsSubmitting(false);
        setHasAnswered(false);
    };

    return (
        <div style={{ maxWidth: "600px", margin: "auto", padding: "24px" }}>
            <h1>문해력 테스트</h1>
            <div style={{ marginBottom: "12px" }}>
                진행: {questionCount}/{MAX_QUESTIONS} | 정답: {correctCount}
            </div>

            {loading && <p>문제를 불러오는 중...</p>}

            {currentQuestion && !finished && (
                <>
                    <QuestionCard
                        questionData={currentQuestion}
                        currentIndex={currentQuestionIndex}
                        testType="reading"
                        onPlayAudio={(text) => dispatch(playTTS({ text, unit: "sentence" }))}
                        onAnswer={handleAnswer}
                        disabled={isSubmitting || hasAnswered} // ✅ disabled 전달
                    />

                    <button
                        onClick={handleNextQuestion}
                        disabled={!hasAnswered || isSubmitting} // ✅ 답변 안 했으면 비활성화
                        style={{
                            marginTop: "24px",
                            padding: "12px 24px",
                            width: "100%",
                            fontSize: "16px",
                            fontWeight: "bold",
                            backgroundColor: (!hasAnswered || isSubmitting) ? "#6c757d" : "#A4B465",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: (!hasAnswered || isSubmitting) ? "not-allowed" : "pointer",
                            opacity: (!hasAnswered || isSubmitting) ? 0.6 : 1,
                        }}
                    >
                        {isSubmitting ? "처리 중..." : `다음 문제 → (${questionCount}/${MAX_QUESTIONS})`}
                    </button>

                    {feedback && (
                        <div
                            style={{
                                marginTop: "16px",
                                padding: "12px",
                                fontWeight: "bold",
                                fontSize: "18px",
                                textAlign: "center",
                                backgroundColor: feedback.includes("정답") ? "#d4edda" : "#f8d7da",
                                color: feedback.includes("정답") ? "#155724" : "#721c24",
                                borderRadius: "8px",
                                border: `2px solid ${feedback.includes("정답") ? "#c3e6cb" : "#f5c6cb"}`,
                            }}
                        >
                            {feedback}
                        </div>
                    )}
                </>
            )}

            {finished && (
                <div style={{ marginTop: "32px", textAlign: "center" }}>
                    <h2>🎉 테스트 완료!</h2>
                    <p style={{ fontSize: "24px", fontWeight: "bold", margin: "16px 0" }}>
                        {correctCount} / {MAX_QUESTIONS}
                    </p>
                    <p style={{ fontSize: "18px" }}>
                        정답률: {Math.round((correctCount / MAX_QUESTIONS) * 100)}%
                    </p>

                    <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px", textAlign: "left" }}>
                        <h3>문제 히스토리</h3>
                        {questionHistory.map((item, idx) => (
                            <div key={idx} style={{
                                padding: "8px",
                                marginBottom: "8px",
                                backgroundColor: item.is_correct ? "#d4edda" : "#f8d7da",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}>
                                <strong>Q{idx + 1}.</strong> {item.question}
                                <br />
                                <span style={{ color: "#666" }}>
                                    당신의 답: {item.user_answer || "미응답"} {item.is_correct ? " ✅" : " ❌"}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleRestart}
                        style={{
                            marginTop: "24px",
                            padding: "12px 24px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                        }}
                    >
                        🔄 다시 시작
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReadingTest;