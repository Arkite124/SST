import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QuestionCard from "@/components/test/QuestionCard";
import { playTTS, stopAudio } from "@/redux/slices/audioSlice";
import {
    setLoading,
    resetVocabTest,
    submitVocabAnswer,
    setEndGame
} from "@/redux/slices/vocabularySlice";
import { vocabularyApi } from "@/utils/vocabularyApi.js";
import LoadingSpinner from "@/components/common/LoadingSpinner.jsx";

const MAX_QUESTIONS = 10;

const VocabularyTest = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        loading,
        feedback,
        correctCount,
        finished,
        error,
        questionHistory
    } = useSelector((state) => state.vocabulary);

    const hasLoaded = useRef(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];
    const questionCount = currentQuestionIndex + 1;

    // ✅ 첫 로드 시 10개 문제 한 번에 받아오기
    useEffect(() => {
        if (!user?.id || !user?.vocabulary_age) return;
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        const loadAllQuestions = async () => {
            dispatch(resetVocabTest());
            dispatch(setLoading(true));

            try {
                const data = await vocabularyApi.startGame({
                    user_id: user.id,
                    age_level: user.vocabulary_age,
                    num_questions: MAX_QUESTIONS,
                });
                setQuestions(data.questions || []);
            } finally {
                dispatch(setLoading(false));
            }
        };

        loadAllQuestions();
    }, [dispatch, user]);

    // ✅ 문제가 바뀔 때마다 hasAnswered 초기화
    useEffect(() => {
        setHasAnswered(false);
    }, [currentQuestionIndex]);

    // ✅ 답안 선택
    const handleAnswer = async (userChoiceIndex) => {
        if (isSubmitting || hasAnswered || !currentQuestion) return;

        setIsSubmitting(true);
        dispatch(stopAudio());

        try {
            await dispatch(
                submitVocabAnswer({
                    user_id: user.id,
                    userChoiceIndex,
                    currentQuestion,
                })
            ).unwrap();

            setHasAnswered(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ✅ 다음 문제 버튼 클릭
    const handleNextQuestion = () => {
        dispatch(stopAudio());
        setHasAnswered(false);

        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleGameEnd();
        }
    };

    // ✅ 게임 종료 - DB 저장
    const handleGameEnd = async () => {
        if (!user?.id || questionHistory.length === 0) {
            return;
        }

        try {
            // ✅ vocabularyApi.endGame 호출 (DB 저장 포함)
            await vocabularyApi.endGame({
                user_id: user.id,
                questionHistory: questionHistory
            });

            // ✅ Redux state 업데이트
            dispatch(setEndGame());

        } catch {
            // 에러가 발생해도 화면에 결과는 표시
            dispatch(setEndGame());
        }
    };

    // ✅ 게임 재시작
    const handleRestart = async () => {
        hasLoaded.current = false;
        setHasAnswered(false);
        setCurrentQuestionIndex(0);
        setQuestions([]);
        dispatch(resetVocabTest());
        dispatch(setLoading(true));

        try {
            const data = await vocabularyApi.startGame({
                user_id: user.id,
                age_level: user.vocabulary_age,
                num_questions: MAX_QUESTIONS,
            });
            setQuestions(data.questions || []);
        } finally {
            dispatch(setLoading(false));
        }
    };

    if (loading)
        return (
            <LoadingSpinner text="문제를 불러오는 중..." />
        );

    if (error)
        return (
            <div className="w-full text-center text-red-500 mt-20">
                ❌ {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
        );

    if (finished)
        return (
            <div className="text-center mt-20 px-4">
                <h2 className="text-2xl font-bold text-green-700 mb-4">
                    🎉 어휘력 테스트 완료!
                </h2>
                <p className="text-lg text-gray-700 mb-4">
                    총 <b>{MAX_QUESTIONS}</b>문제 중 <b>{correctCount}</b>문제 정답!
                </p>
                <p className="text-md text-gray-600 mb-6">
                    정답률: <b>{Math.round((correctCount / MAX_QUESTIONS) * 100)}%</b>
                </p>

                {/* ✅ 문제 히스토리 표시 */}
                <div className="max-w-2xl mx-auto mt-6 p-4 bg-gray-50 rounded-lg text-left">
                    <h3 className="text-lg font-bold mb-4">📝 문제 히스토리</h3>
                    {questionHistory.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-3 mb-2 rounded ${
                                item.isCorrect ? "bg-green-100" : "bg-red-100"
                            }`}
                        >
                            <div className="font-semibold text-sm mb-1">
                                Q{idx + 1}. {item.question}
                            </div>
                            <div className="text-sm text-gray-700 mt-1">
                                당신의 답: <b>{item.userAnswer}</b>{" "}
                                {item.isCorrect ? "✅" : "❌"}
                            </div>
                            {!item.isCorrect && (
                                <div className="text-sm text-red-700 mt-1">
                                    정답: <b>{item.correctAnswer}</b>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleRestart}
                    className="mt-6 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
                >
                    🔄 다시 시작하기
                </button>
            </div>
        );

    return (
        <div style={{ margin: "auto", padding: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
                어휘력 테스트
            </h1>
            <div style={{ marginBottom: "12px", color: "#666" }}>
                진행: {questionCount}/{MAX_QUESTIONS} | 정답: {correctCount}
            </div>

            { currentQuestion && (
                <>
                    <QuestionCard
                        questionData={currentQuestion}
                        currentIndex={currentQuestionIndex}
                        testType="vocabulary"
                        onPlayAudio={(text) =>
                            dispatch(playTTS({ text, unit: "sentence" }))
                        }
                        onAnswer={handleAnswer}
                        disabled={isSubmitting || hasAnswered}
                    />

                    <button
                        onClick={handleNextQuestion}
                        disabled={!hasAnswered || isSubmitting}
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
                        {isSubmitting ? "처리 중..." :
                            currentQuestionIndex + 1 < questions.length
                                ? `다음 문제 → (${questionCount}/${MAX_QUESTIONS})`
                                : "결과 보기"}
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
                            {typeof feedback === "string" ? feedback : JSON.stringify(feedback)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VocabularyTest;