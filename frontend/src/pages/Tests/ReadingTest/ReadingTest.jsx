import React, { useEffect, useRef, useState } from "react";
import QuestionCard from "@/components/test/QuestionCard";
import { useDispatch, useSelector } from "react-redux";
import { playTTS, stopAudio } from "@/redux/slices/audioSlice";
import { endGame, resetTest, submitAnswer as submitAnswerAction, nextQuestion } from "@/redux/slices/ReadingSlice.js";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import { readingApi } from "@/utils/readingApi";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";

const MAX_QUESTIONS = 10;

const ReadingTest = () => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const { questions, currentQuestionIndex, questionHistory, finished, loading, feedback } = useSelector((state) => state.reading);

    const currentQuestion = questions[currentQuestionIndex];
    const questionCount = currentQuestionIndex + 1;
    const correctCount = questionHistory.filter(q => q.is_correct).length;

    const hasFetchedRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAnswered, setHasAnswered] = useState(false); // ✅ 답변 완료 상태
    const [isOpen, setIsOpen] = useState(false);

    useAuthLoad();

    // 🔹 게임 시작 - readingApi 기반
    useEffect(() => {
        if (!hasFetchedRef.current && user?.id) {
            hasFetchedRef.current = true;
            (async () => {
                dispatch({ type: "reading/fetchQuestions/pending" }); // ✅ 로딩 시작

                try {
                    const data = await readingApi.startGame(user.id, MAX_QUESTIONS, user.vocabulary_age);

                    dispatch(resetTest());
                    dispatch({
                        type: "reading/fetchQuestions/fulfilled",
                        payload: data.questions
                    });
                } catch (error) {
                    dispatch({ type: "reading/fetchQuestions/rejected" });
                    console.error("문제 불러오기 실패:", error);
                }
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

    if (loading)
        return (
            <LoadingSpinner text="문제를 불러오는 중..." />
        );

    if (finished)
        return(
            <div className={`text-center px-4 ${isOpen ? 'mt-5' : 'mt-20'}`}>
                {!isOpen && (
                    <>
                        <h2 className="text-2xl font-bold text-green-700 mb-4">
                            문해력 테스트 완료!
                        </h2>
                        <p className="text-lg text-gray-700 mb-4">
                            총 <b>{MAX_QUESTIONS}</b>문제 중 <b>{correctCount}</b>문제 정답!
                        </p>
                    </>
                )}

                {/* 🔽 문제 히스토리 토글 */}
                <div className="w-[500px] p-4 bg-gray-50 rounded-lg text-left">

                    {/* 토글 헤더 */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex justify-between items-center"
                    >
                        <h3 className="text-lg font-bold">문제 다시 보기</h3>
                        <span className="text-xl">
                        {isOpen ? "▲" : "▼"}
                    </span>
                    </button>

                    {/* 토글 내용 */}
                    <div
                        className={`transition-all duration-300 overflow-hidden ${
                            isOpen ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0"
                        }`}
                    >
                        {questionHistory.map((item, idx) => (
                            <div
                                key={idx}
                                className={`p-2 mb-2 rounded ${
                                    item.is_correct ? "bg-green-100" : "bg-red-100"
                                }`}
                            >
                                <div className="font-semibold text-sm">
                                    Q{idx + 1}. {item.question}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 mt-1">
                                        당신의 답: <b>{item.user_answer}</b>{" "}
                                    </div>
                                    {!item.is_correct && (
                                        <div className="text-sm font-bold text-red-700 mt-1 mr-3">
                                            정답: <b>{item.correct_answer}</b>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!isOpen && (
                    <button
                        onClick={handleRestart}
                        className="mt-6 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
                    >
                        다시 시작하기
                    </button>
                )}
            </div>
        )

    return (
        <div style={{ maxWidth: "600px", margin: "auto", padding: "24px" }}>
            <h1>문해력 테스트</h1>
            <div style={{ marginBottom: "12px" }}>
                진행: {questionCount}/{MAX_QUESTIONS} | 정답: {correctCount}
            </div>

            {loading && <LoadingSpinner text="문제를 불러오는 중..." />}

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


        </div>
    );
};

export default ReadingTest;