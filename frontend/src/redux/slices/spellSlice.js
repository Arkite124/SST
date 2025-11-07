// 📁 src/store/slice/spellSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { spellAPI } from '@/services/spellApi.js';

const QUESTION_TIME = 30; // 문제당 제한 시간

// Async Thunks
export const startSpellGame = createAsyncThunk(
    'spell/startSpellGame',
    async ({ gameId, difficulty }, { rejectWithValue }) => {
        try {
            // 🔥 타임아웃 설정 (10초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await spellAPI.startSpellGame(gameId, difficulty);

            clearTimeout(timeoutId);
            return response.data;
        } catch (error) {
            if (error.name === 'AbortError') {
                return rejectWithValue('게임 시작 시간 초과. 다시 시도해주세요.');
            }
            return rejectWithValue(error.message);
        }
    }
);

export const submitSpellAnswer = createAsyncThunk(
    'spell/submitSpellAnswer',
    async ({ gameId, answer, usedProblems }, { rejectWithValue }) => {
        try {
            const response = await spellAPI.submitWord(gameId, answer, usedProblems);
            const data=response.data
            console.log(data)
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const restartSpellGame = createAsyncThunk(
    'spell/restartSpellGame',
    async ({ gameId, difficulty }, { rejectWithValue }) => {
        try {
            const response = await spellAPI.restartSpellGame(gameId, difficulty);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 문제를 고유하게 식별하는 함수 (initial만 사용)
const getProblemKey = (initial) => {
    return initial;
};

// 초기 상태
const initialState = {
    gameId: null,
    difficulty: 'medium',
    gameStarted: false,
    gameOver: false,
    score: 0,
    currentProblem: null,
    currentQuestionNumber: 0,
    timeLeft: QUESTION_TIME,
    timerActive: false,
    message: '',
    messageType: '',
    loading: false,
    error: null,
    usedProblems: [],
};

const spellSlice = createSlice({
    name: 'spell',
    initialState,
    reducers: {
        startTimer: (state) => {
            state.timeLeft = QUESTION_TIME;
            state.timerActive = true;
        },

        // 🔥 타이머 감소 (여기서만 정의)
        tickTimer: (state) => {
            if (state.gameOver || !state.timerActive || state.loading) {
                return;
            }
            if (state.timeLeft > 0) {
                state.timeLeft -= 1;
            }
            if (state.timeLeft <= 0) {
                state.timerActive = false;
                state.gameOver = true;
                state.gameStarted = false;
                // 🔥 현재 점수 유지하면서 종료
                state.message = `시간 초과! 총 ${state.score}개 맞혔어요!`;
                state.messageType = 'error';
            }
        },

        stopTimer: (state) => {
            state.timerActive = false;
        },

        resetTimer: (state) => {
            state.timeLeft = QUESTION_TIME;
            state.timerActive = true;
        },

        clearMessage: (state) => {
            state.message = '';
            state.messageType = '';
        },

        resetGameState: () => {
            return { ...initialState };
        },
    },
    extraReducers: (builder) => {
        builder
            // Start Game
            .addCase(startSpellGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(startSpellGame.fulfilled, (state, action) => {
                state.loading = false;
                const payload = action.payload || {};

                state.gameId = payload.game_id ?? `game-${Date.now()}`;
                state.difficulty = payload.difficulty ?? state.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.score = 0;
                state.currentQuestionNumber = 1;
                state.currentProblem = {
                    initial: payload.first_initial ?? '',
                    definition: payload.first_definition ?? '',
                };
                state.message = payload.message ?? '게임이 시작되었습니다';
                state.messageType = 'success';

                state.usedProblems = [payload.first_initial];
                state.timeLeft = QUESTION_TIME;
                state.timerActive = true;
            })
            .addCase(startSpellGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || action.error.message;
                state.message = '게임 시작 실패';
                state.messageType = 'error';
            })

            // Submit Answer
            .addCase(submitSpellAnswer.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.timerActive = false;
            })
            .addCase(submitSpellAnswer.fulfilled, (state, action) => {
                state.loading = false;
                const payload = action.payload || {};

                state.message = payload.result || payload.message || '';
                // 🔥 정답 여부 판단 개선 (correct 필드 또는 result 메시지로 판단)
                const isCorrect = payload.correct === true ||
                    (payload.result && payload.result.includes('정답'));
                state.messageType = payload.correct ? 'success' : 'error';

                // 🔥 정답 시 점수 업데이트
                if (isCorrect) {
                    state.score += 1;
                    console.log('✅ 정답! 현재 점수:', state.score);
                } else {
                    console.log('❌ 오답! 현재 점수:', state.score);
                }

                // 게임 종료
                if (payload.finished) {
                    state.gameOver = true;
                    state.score = payload.score ?? state.score;
                    state.currentProblem = null;
                    state.gameStarted = false;
                    state.timerActive = false;
                    state.timeLeft = 0;
                    state.message = `게임 종료! 최종 점수: ${state.score}점`;
                    state.messageType = 'info';
                    return;
                }

                // 다음 문제로 넘어갈 때
                if (payload.next_initial && payload.next_definition) {
                    const problemKey = getProblemKey(payload.next_initial);

                    if (state.usedProblems.includes(problemKey)) {
                        console.warn('⚠️ 중복된 문제 감지:', problemKey);
                        state.message = '중복된 문제입니다. 다시 시도해주세요.';
                        state.messageType = 'warning';
                        // 🔥 중복이어도 타이머는 다시 시작
                        state.timerActive = true;
                        return;
                    }
                    // 🔥 문제 번호 증가
                    state.currentQuestionNumber += 1;
                    // 🔥 새 문제 설정
                    state.currentProblem = {
                        initial: payload.next_initial,
                        definition: payload.next_definition,
                    };

                    state.usedProblems.push(problemKey);
                    state.timeLeft = QUESTION_TIME;
                    state.timerActive = true;
                } else {
                    // 🔥 다음 문제 데이터가 없으면 타이머 재개
                    console.warn('⚠️ 다음 문제 데이터 없음, 타이머 재개');
                    state.timerActive = true;
                }
            })
            .addCase(submitSpellAnswer.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || action.error.message;
                state.message = '정답 제출 실패';
                state.messageType = 'error';
                state.timerActive = false;
            })

            // Restart Game
            .addCase(restartSpellGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(restartSpellGame.fulfilled, (state, action) => {
                state.loading = false;
                const payload = action.payload || {};

                state.gameId = payload.game_id ?? `game-${Date.now()}`;
                state.difficulty = payload.difficulty ?? state.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.score = 0;
                state.currentQuestionNumber = 1;
                state.currentProblem = {
                    initial: payload.first_initial ?? '',
                    definition: payload.first_definition ?? '',
                };
                state.message = payload.message || '게임을 다시 시작합니다.';
                state.messageType = 'success';

                state.usedProblems = [getProblemKey(payload.first_initial)];
                state.timeLeft = QUESTION_TIME;
                state.timerActive = true;
            })
            .addCase(restartSpellGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || action.error.message;
                state.message = '게임 재시작 실패';
                state.messageType = 'error';
            });
    },
});

export const {
    startTimer,
    tickTimer,
    stopTimer,
    resetTimer,
    clearMessage,
    resetGameState
} = spellSlice.actions;

export default spellSlice.reducer;