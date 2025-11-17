// src/store/slices/test/readingSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance.js";

/* ----------------------------------------
   🔥 문제 가져오기 (userId 제거)
----------------------------------------- */
export const fetchQuestions = createAsyncThunk(
    "reading/fetchQuestions",
    async ({ ageLevel }, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post("/test/reading/start", {
                num_questions: 10,
                age_level: ageLevel,
            });
            return res.data.questions;
        } catch (err) {
            return rejectWithValue(err.response?.data || "문제 불러오기 실패");
        }
    }
);

/* ----------------------------------------
   🔥 정답 제출 (userId 제거)
----------------------------------------- */
export const submitAnswer = createAsyncThunk(
    "reading/submitAnswer",
    async ({ questionData, userChoiceIndex }, { rejectWithValue }) => {
        try {
            if (!questionData) {
                throw new Error("questionData가 없습니다");
            }

            const payload = {
                question_data: {
                    question_id: Number(questionData.question_id ?? 0),
                    choices: Array.isArray(questionData.choices) ? questionData.choices : [],
                    correct_index: Number(questionData.correct_index ?? 0),
                    correct_answer: questionData.correct_answer ?? "",
                    age_level: Number(questionData.age_level ?? 7),
                },
                user_choice_index: Number(userChoiceIndex ?? 0),
            };

            const res = await axiosInstance.post("/test/reading/verify", payload);

            return {
                ...res.data,
                questionData,
                userChoiceIndex
            };

        } catch (err) {
            return rejectWithValue(err.response?.data || "답안 제출 실패");
        }
    }
);

/* ----------------------------------------
   🔥 게임 종료 (userId 제거)
----------------------------------------- */
export const endGame = createAsyncThunk(
    "reading/endGame",
    async ({ questionHistory, testType = "reading" }, { rejectWithValue }) => {
        try {
            if (!questionHistory || questionHistory.length === 0) {
                throw new Error("questionHistory가 없습니다.");
            }

            const payload = {
                test_type: testType,
                question_history: questionHistory.map(q => ({
                    question_id: Number(q.question_id),
                    question: q.question,
                    choices: Array.isArray(q.choices) ? q.choices : [],
                    userAnswer: q.user_answer ?? "",
                    correctAnswer: q.correct_answer ?? q.choices?.[q.correct_index] ?? "",
                    isCorrect: q.is_correct ?? false,
                    age_level: Number(q.age_level ?? 7)
                }))
            };

            const res = await axiosInstance.post("/test/reading/end", payload);

            return {
                total_score: res.data.total_score,
                message: res.data.message
            };
        } catch (err) {
            return rejectWithValue(err.response?.data || "게임 종료 실패");
        }
    }
);

/* ----------------------------------------
   🔥 Slice
----------------------------------------- */
const readingSlice = createSlice({
    name: "reading",
    initialState: {
        questions: [],
        currentQuestionIndex: 0,
        questionHistory: [],
        loading: false,
        error: null,
        finished: false,
        feedback: null,
    },
    reducers: {
        resetTest: (state) => {
            state.questions = [];
            state.currentQuestionIndex = 0;
            state.questionHistory = [];
            state.finished = false;
            state.error = null;
            state.feedback = null;
        },
        nextQuestion: (state) => {
            if (state.currentQuestionIndex + 1 < state.questions.length) {
                state.currentQuestionIndex += 1;
            } else {
                state.finished = true;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchQuestions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchQuestions.fulfilled, (state, action) => {
                state.loading = false;
                state.questions = action.payload;
                state.currentQuestionIndex = 0;
                state.finished = false;
            })
            .addCase(fetchQuestions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(submitAnswer.fulfilled, (state, action) => {
                const { questionData, userChoiceIndex, correct, correct_answer, user_answer } = action.payload;

                state.questionHistory.push({
                    question_id: questionData.question_id,
                    question: questionData.question,
                    choices: questionData.choices,
                    user_answer: user_answer ?? questionData.choices[userChoiceIndex],
                    correct_answer: correct_answer,
                    is_correct: correct,
                    age_level: questionData.age_level ?? 7,
                });

                state.feedback = correct
                    ? "정답입니다!"
                    : `틀렸습니다! 정답: ${correct_answer}`;
            })
            .addCase(submitAnswer.rejected, (state, action) => {
                state.error = action.payload;
            })

            .addCase(endGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(endGame.fulfilled, (state, action) => {
                state.loading = false;
                state.finished = true;
                state.feedback = `게임 종료! 점수: ${action.payload.total_score} / ${state.questions.length}`;
            })
            .addCase(endGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { resetTest, nextQuestion } = readingSlice.actions;
export default readingSlice.reducer;
