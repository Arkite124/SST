import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chainAPI } from '@/utils/chainApi.js';
import {
    createBaseGameState,
    createBaseGameReducers,
    setLoadingState,
    setSuccessMessage,
    setErrorMessage,
} from './baseGameSlice';

const TURN_TIME = 10;

/* -----------------------------
    🔥 공통 Axios 데이터 추출기
------------------------------ */
const extract = (payload) => payload?.data ?? payload;

/* -----------------------------
    🔥 게임 시작
------------------------------ */
export const startGame = createAsyncThunk(
    'chain/startGame',
    async (difficulty, { rejectWithValue }) => {
        try {
            const res = await chainAPI.startGame(difficulty);
            return extract(res);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

/* -----------------------------
    🔥 단어 제출
------------------------------ */
export const submitWord = createAsyncThunk(
    'chain/submitWord',
    async ({ gameId, word, timeUp = false }, { rejectWithValue }) => {
        try {
            const res = await chainAPI.submitWord(gameId, word, timeUp);
            return extract(res);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

/* -----------------------------
    🔥 게임 삭제
------------------------------ */
export const endGame = createAsyncThunk(
    'chain/endGame',
    async (gameId, { rejectWithValue }) => {
        try {
            if (gameId) await chainAPI.endGame(gameId);
            return gameId;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

/* -----------------------------
    🔥 게임 재시작
------------------------------ */
export const restartGame = createAsyncThunk(
    'chain/restartGame',
    async (_, { getState, dispatch }) => {
        const { difficulty, gameId } = getState().chain;

        if (gameId) await dispatch(endGame(gameId));

        const res = await chainAPI.startGame(difficulty);
        return extract(res);
    }
);

/* -----------------------------
    🔥 초기 상태
------------------------------ */
const chainInitialState = createBaseGameState({
    difficulty: 'medium',
    winner: null,
    history: [],
    currentWord: '',
    turnTimeLeft: TURN_TIME,
    turnTimerActive: false,
    reason: '',
    lastUserWord: '',
    lastComputerWord: '',
    defeatReason: '',
});

/* -----------------------------
    🔥 Slice 본체
------------------------------ */
const chainSlice = createSlice({
    name: 'chain',
    initialState: chainInitialState,
    reducers: {
        ...createBaseGameReducers(),

        startTurn: (state) => {
            state.turnTimeLeft = TURN_TIME;
            state.turnTimerActive = true;
        },
        tickTurn: (state) => {
            if (state.gameOver || !state.turnTimerActive || state.loading) return;

            state.turnTimeLeft -= 1;

            if (state.turnTimeLeft <= 0) {
                state.turnTimerActive = false;
                state.gameOver = true;
                state.winner = 'computer';
                state.defeatReason = '⏰ 시간 초과! 10초 안에 단어를 입력하지 못했습니다.';
                state.gameStarted = false;
                state.turnTimeLeft = 0;
            }
        },
        stopTurn: (state) => {
            state.turnTimerActive = false;
        },
        resetTurn: (state) => {
            state.turnTimeLeft = TURN_TIME;
            state.turnTimerActive = true;
        },
        resetGame: () => ({ ...chainInitialState }),
        clearMessage: (state) => {
            state.message = '';
            state.messageType = '';
        },
    },

    /* -----------------------------
        🔥 Extra Reducers
    ------------------------------ */
    extraReducers: (builder) => {
        builder
            /* -----------------------------
                🚀 게임 시작 성공
            ------------------------------ */
            .addCase(startGame.fulfilled, (state, action) => {
                const data = action.payload;

                state.gameId = data.game_id;
                state.difficulty = data.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.winner = null;
                state.defeatReason = '';
                state.lastUserWord = '';

                setSuccessMessage(state, data.message);

                if (data.first_word) {
                    state.history = [
                        {
                            word: data.first_word,
                            definition: data.first_definition || '시작 단어',
                            type: 'computer',
                        },
                    ];
                    state.currentWord = data.first_word;
                } else {
                    state.history = [];
                }

                state.turnTimeLeft = TURN_TIME;
                state.turnTimerActive = true;
            })

            /* -----------------------------
                🔥 단어 제출 중
            ------------------------------ */
            .addCase(submitWord.pending, (state) => {
                setLoadingState(state, true);
                state.turnTimerActive = false;
            })

            /* -----------------------------
                🔥 단어 제출 성공
            ------------------------------ */
            .addCase(submitWord.fulfilled, (state, action) => {
                const data = action.payload;
                setLoadingState(state, false);

                // ❌ 사용자 패배 처리
                if (!data.success) {
                    state.turnTimerActive = false;
                    setErrorMessage(state, data.message);
                    state.defeatReason = data.reason || data.message;

                    state.lastUserWord =
                        data.user_word ||
                        data.last_user_word ||
                        data.user_wrong_word ||
                        '';

                    if (data.game_over) {
                        state.gameOver = true;
                        state.winner = data.winner || 'computer';
                        state.gameStarted = false;
                        state.turnTimeLeft = 0;
                    }
                    return;
                }

                // ⭕ 사용자 단어 성공
                if (data.user_word) {
                    state.history.push({
                        word: data.user_word,
                        definition: data.user_definition,
                        type: 'user',
                    });
                    state.lastUserWord = data.user_word;
                }

                // ⭕ 컴퓨터 단어 성공
                if (data.computer_word) {
                    state.history.push({
                        word: data.computer_word,
                        definition: data.computer_definition,
                        type: 'computer',
                    });
                    state.currentWord = data.computer_word;
                    state.lastComputerWord = data.computer_word;
                }

                // 🔥 게임 종료
                if (data.game_over) {
                    state.gameOver = true;
                    state.winner = data.winner || 'user';
                    state.gameStarted = false;
                    state.turnTimerActive = false;
                    state.turnTimeLeft = 0;
                } else {
                    // 🔥 다음 턴 진행
                    state.turnTimeLeft = TURN_TIME;
                    state.turnTimerActive = true;
                }
            })

            /* -----------------------------
                ❌ 단어 제출 실패
            ------------------------------ */
            .addCase(submitWord.rejected, (state, action) => {
                setLoadingState(state, false);
                state.turnTimerActive = false;
                setErrorMessage(
                    state,
                    action.payload || '알 수 없는 오류가 발생했습니다.'
                );
            })

            /* -----------------------------
                🗑 게임 삭제
            ------------------------------ */
            .addCase(endGame.fulfilled, (_, action) => {
                console.log(`🗑 게임 ${action.payload} 삭제됨`);
            })

            /* -----------------------------
                🚀 게임 재시작
            ------------------------------ */
            .addCase(restartGame.fulfilled, (state, action) => {
                const data = action.payload;

                state.gameId = data.game_id;
                state.difficulty = data.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.winner = null;
                state.defeatReason = '';
                state.lastUserWord = '';
                state.history = [];

                if (data.first_word) {
                    state.history = [
                        {
                            word: data.first_word,
                            definition: data.first_definition || '시작 단어',
                            type: 'computer',
                        },
                    ];
                    state.currentWord = data.first_word;
                }

                state.turnTimeLeft = TURN_TIME;
                state.turnTimerActive = true;

                setSuccessMessage(state, data.message);
            });
    },
});

export const { startTurn, tickTurn, stopTurn, resetTurn, resetGame, clearMessage } =
    chainSlice.actions;

export default chainSlice.reducer;
