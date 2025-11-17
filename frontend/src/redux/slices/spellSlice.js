import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { spellAPI } from '@/utils/spellApi.js';

const QUESTION_TIME = 30;

/* ------------------------------
   🔥 Game Start
------------------------------ */
export const startSpellGame = createAsyncThunk(
    "spell/start",
    async ({ gameId, difficulty }, { rejectWithValue }) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const data = await spellAPI.startSpellGame(gameId, difficulty);

            clearTimeout(timeoutId);
            return data; // 🔥 data 그대로 반환
        } catch (err) {
            if (err.name === "AbortError") {
                return rejectWithValue("게임 시작 시간 초과");
            }
            return rejectWithValue(err.message);
        }
    }
);

/* ------------------------------
   🔥 Submit Answer
------------------------------ */
export const submitSpellAnswer = createAsyncThunk(
    "spell/submit",
    async ({ gameId, answer, usedProblems }, { rejectWithValue }) => {
        try {
            const data = await spellAPI.submitWord(gameId, answer, usedProblems);
            return data; // 🔥 data 그대로 반환
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

/* ------------------------------
   🔥 Restart
------------------------------ */
export const restartSpellGame = createAsyncThunk(
    "spell/restart",
    async ({ gameId, difficulty }, { rejectWithValue }) => {
        try {
            const data = await spellAPI.restartSpellGame(gameId, difficulty);
            return data;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
)

/* ------------------------------
   🔥 Problem Key
------------------------------ */
const getProblemKey = (initial) => initial;

/* ------------------------------
   🔥 Initial State
------------------------------ */
const initialState = {
    gameId: null,
    difficulty: "medium",
    gameStarted: false,
    gameOver: false,
    score: 0,
    currentProblem: null,
    currentQuestionNumber: 0,
    timeLeft: QUESTION_TIME,
    timerActive: false,
    message: "",
    messageType: "",
    loading: false,
    error: null,
    usedProblems: [],
};

/* ------------------------------
   🔥 Slice
------------------------------ */
const spellSlice = createSlice({
    name: "spell",
    initialState,
    reducers: {
        startTimer: (state) => {
            state.timeLeft = QUESTION_TIME;
            state.timerActive = true;
        },

        tickTimer: (state) => {
            if (state.gameOver || !state.timerActive || state.loading) return;

            if (state.timeLeft > 0) {
                state.timeLeft -= 1;
            }

            if (state.timeLeft <= 0) {
                state.timerActive = false;
                state.gameOver = true;
                state.gameStarted = false;
                state.message = `⏰ 시간 초과! 총 ${state.score}개 맞혔어요`;
                state.messageType = "error";
            }
        },

        stopTimer: (state) => { state.timerActive = false; },
        resetTimer: (state) => { state.timeLeft = QUESTION_TIME; state.timerActive = true; },
        clearMessage: (state) => { state.message = ""; state.messageType = ""; },
        resetGameState: () => ({ ...initialState }),
    },

    extraReducers: (builder) => {
        builder

            /* ---------------- GAME START ---------------- */
            .addCase(startSpellGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(startSpellGame.fulfilled, (state, action) => {
                state.loading = false;

                const data = action.payload;

                state.gameId = data.game_id;
                state.difficulty = data.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.score = 0;
                state.currentQuestionNumber = 1;

                state.currentProblem = {
                    initial: data.first_initial,
                    definition: data.first_definition,
                };

                state.usedProblems = [data.first_initial];
                state.message = data.message;
                state.messageType = "success";

                state.timeLeft = QUESTION_TIME;
                state.timerActive = true;
            })
            .addCase(startSpellGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || action.error.message;
                state.message = "게임 시작 실패";
                state.messageType = "error";
            })

            /* ---------------- SUBMIT ANSWER ---------------- */
            .addCase(submitSpellAnswer.pending, (state) => {
                state.loading = true;
                state.timerActive = false;
            })
            .addCase(submitSpellAnswer.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload;

                state.message = data.message || data.result;
                state.messageType = data.correct ? "success" : "error";

                if (data.correct) {
                    state.score += 1;
                }

                // 🔥 게임 종료
                if (data.finished) {
                    state.gameOver = true;
                    state.gameStarted = false;
                    state.timerActive = false;
                    state.currentProblem = null;
                    state.timeLeft = 0;
                    state.message = `게임 종료! 점수: ${state.score}`;
                    state.messageType = "info";
                    return;
                }

                // 🔥 다음 문제
                const nextKey = getProblemKey(data.next_initial);

                if (state.usedProblems.includes(nextKey)) {
                    state.message = "⚠️ 중복 문제! 다시 시도하세요";
                    state.messageType = "warning";
                    state.timerActive = true;
                    return;
                }

                state.currentQuestionNumber += 1;
                state.currentProblem = {
                    initial: data.next_initial,
                    definition: data.next_definition,
                };
                state.usedProblems.push(nextKey);

                state.timeLeft = QUESTION_TIME;
                state.timerActive = true;
            })
            .addCase(submitSpellAnswer.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || action.error.message;
                state.message = "정답 제출 실패";
                state.messageType = "error";
            })

            /* ---------------- RESTART ---------------- */
            .addCase(restartSpellGame.pending, (state) => {
                state.loading = true;
            })
            .addCase(restartSpellGame.fulfilled, (state, action) => {
                const data = action.payload;

                state.loading = false;
                state.gameId = data.game_id;
                state.difficulty = data.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.score = 0;
                state.currentQuestionNumber = 1;

                state.currentProblem = {
                    initial: data.first_initial,
                    definition: data.first_definition,
                };
                state.usedProblems = [data.first_initial];

                state.message = data.message || "게임을 다시 시작합니다";
                state.messageType = "success";

                state.timeLeft = QUESTION_TIME;
                state.timerActive = true;
            })
            .addCase(restartSpellGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.message = "게임 재시작 실패";
                state.messageType = "error";
            });
    }
});

export const {
    startTimer,
    tickTimer,
    stopTimer,
    resetTimer,
    clearMessage,
    resetGameState,
} = spellSlice.actions;

export default spellSlice.reducer;
