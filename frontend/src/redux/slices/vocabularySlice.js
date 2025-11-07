import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {vocabularyApi} from "@/utils/vocabularyApi.js";
// --- Thunks ---
export const startVocabGame = createAsyncThunk(
    "vocabulary/startGame",
    async ({ user_id,age_level }, { rejectWithValue }) => {
        try {
            const res = await vocabularyApi.startGame({ user_id, age_level });
            return res;
        } catch (err) {
            return rejectWithValue(err.response?.data || "문제 불러오기 실패");
        }
    }
);

export const submitVocabAnswer = createAsyncThunk(
    "vocabulary/submitAnswer",
    async ({ user_id, userChoiceIndex, currentQuestion }, { rejectWithValue }) => {
        try {
            if (!currentQuestion) {
                return rejectWithValue("현재 문제가 로드되지 않았습니다.");
            }

            const res = await vocabularyApi.submitAnswer({
                user_id,
                question_data: currentQuestion,
                user_choice_index: userChoiceIndex,
            });

            return {
                correct: res.correct,
                user_answer: currentQuestion.choices[userChoiceIndex],
                correct_answer: currentQuestion.correct_answer,
                currentQuestion,
                userChoiceIndex,
            };
        } catch (err) {
            return rejectWithValue(err.response?.data || "답안 제출 실패");
        }
    }
);

export const endVocabGame = createAsyncThunk(
    "vocabulary/endGame",
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const user_id = state.auth.id;
            const questionHistory = state.vocabulary.questionHistory;

            if (!user_id) {
                return rejectWithValue("사용자 ID를 찾을 수 없습니다.");
            }
            if (!questionHistory || questionHistory.length === 0) {
                // API 레벨에서도 체크하지만, 클라이언트 레벨에서 미리 방지
                return rejectWithValue("제출할 문제 기록이 없습니다.");
            }

            const res = await vocabularyApi.endGame({ user_id, questionHistory });
            return res;
        } catch (err) {
            return rejectWithValue(err.response?.data || "게임 종료 실패");
        }
    }
)
// --- Slice ---
const vocabularySlice = createSlice({
    name: "vocabulary",
    initialState: {
        currentQuestion: null,
        questionCount: 0,
        correctCount: 0,
        questionHistory: [],
        loading: false,
        error: null,
        finished: false,
        feedback: "",
    },
    reducers: {
        resetVocabTest: (state) => {
            state.currentQuestion = null;
            state.questionCount = 0;
            state.correctCount = 0;
            state.questionHistory = [];
            state.finished = false;
            state.feedback = "";
            state.error = null;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setQuestion: (state, action) => {
            state.currentQuestion = action.payload;
        },
        setStartGame: (state, action) => {
            state.currentQuestion = action.payload;
            state.finished = false;
        },
        setEndGame: (state) => {
            state.finished = true;
        },
        incrementQuestionCount: (state) => {
            state.questionCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            // --- START GAME ---
            .addCase(startVocabGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(startVocabGame.fulfilled, (state, action) => {
                state.loading = false;
                state.currentQuestion = action.payload || null;
                state.error = null;
            })
            .addCase(startVocabGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "문제 불러오기 실패";
            })

            // --- SUBMIT ANSWER ---
            .addCase(submitVocabAnswer.fulfilled, (state, action) => {
                const { correct, correct_answer, user_answer, currentQuestion, userChoiceIndex } = action.payload;

                if (correct) {
                    state.correctCount += 1;
                    state.feedback = `🎉 정답입니다! (${user_answer})`;
                } else {
                    state.feedback = `❌ 오답입니다. 정답은 "${correct_answer}" 입니다.`;
                }

                if (currentQuestion) {
                    // ✅ 백엔드 EndGameRequest에 맞춘 형식으로 저장
                    state.questionHistory.push({
                        questionNumber: state.questionCount + 1,
                        question_id: currentQuestion.question_id,
                        question: currentQuestion.question || currentQuestion.blank_sentence,
                        blank_sentence: currentQuestion.blank_sentence, // ✅ 백엔드가 기대하는 필드
                        choices: currentQuestion.choices,
                        userAnswer: currentQuestion.choices[userChoiceIndex],
                        correctAnswer: correct_answer,
                        isCorrect: correct,
                        ageLevel: currentQuestion.age_level,
                        age_level: currentQuestion.age_level, // ✅ 백엔드 호환
                        timestamp: new Date().toISOString(),
                    });

                    state.questionCount += 1;
                }

                state.loading = false;
            })
            .addCase(submitVocabAnswer.rejected, (state, action) => {
                state.error = action.payload || "답안 제출 실패";
            })

            // --- END GAME ---
            .addCase(endVocabGame.fulfilled, (state) => {
                state.finished = true;
                state.feedback = "게임이 종료되었습니다.";
            })
            .addCase(endVocabGame.rejected, (state, action) => {
                state.error = action.payload || "게임 종료 실패";
            });
    },
});

export const {
    setLoading,
    setQuestion,
    setStartGame,
    setEndGame,
    resetVocabTest,
    incrementQuestionCount,
} = vocabularySlice.actions;
export default vocabularySlice.reducer;
