import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chainAPI } from '@/services/chainApi.js'
import { createBaseGameState, createBaseGameReducers, setLoadingState, setSuccessMessage, setErrorMessage } from './baseGameSlice';

const TURN_TIME = 10;

// Async Thunks
export const startGame = createAsyncThunk('chain/startGame', async (difficulty, { rejectWithValue }) => {
    try {
        return await chainAPI.startGame(difficulty);
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

export const submitWord = createAsyncThunk('chain/submitWord', async ({ gameId, word, timeUp = false }, { rejectWithValue }) => {
    try {
        return await chainAPI.submitWord(gameId, word, timeUp);
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

// ✅ 게임 종료 thunk 추가
export const endGame = createAsyncThunk('chain/endGame', async (gameId, { rejectWithValue }) => {
    try {
        if (gameId) {
            await chainAPI.endGame(gameId);
            console.log(`🗑️ 게임 ${gameId} 삭제 완료`);
        }
        return gameId;
    } catch (error) {
        console.error('게임 삭제 실패:', error);
        return rejectWithValue(error.message);
    }
});

// ✅ 재시작 시 기존 게임 삭제 후 새 게임 시작
export const restartGame = createAsyncThunk('chain/restartGame', async (_, { getState, dispatch }) => {
    const { difficulty, gameId } = getState().chain;

    // ✅ 기존 게임이 있으면 삭제
    if (gameId) {
        await dispatch(endGame(gameId));
    }

    // ✅ 새 게임 시작
    const result = await chainAPI.startGame(difficulty);
    return result;
});

// 초기 상태
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

const chainSlice = createSlice({
    name: 'chain',
    initialState: chainInitialState,
    reducers: {
        ...createBaseGameReducers(),
        // 🔥 타이머 시작
        startTurn: (state) => {
            state.turnTimeLeft = TURN_TIME;
            state.turnTimerActive = true;
        },
        // 🔥 1초 감소
        tickTurn: (state) => {
            if (state.gameOver || !state.turnTimerActive || state.loading) {
                return;
            }
            if (state.turnTimeLeft > 0) {
                state.turnTimeLeft -= 1;
            }
            if (state.turnTimeLeft <= 0) {
                state.turnTimerActive = false;
                state.gameOver = true;
                state.winner = 'computer';
                state.defeatReason = '⏰ 시간 초과! 10초 안에 단어를 입력하지 못했습니다.';
                state.gameStarted = false;
            }
        },
        // 🔥 타이머 정지
        stopTurn: (state) => {
            state.turnTimerActive = false;
        },
        // 🔥 타이머 리셋
        resetTurn: (state) => {
            state.turnTimeLeft = TURN_TIME;
            state.turnTimerActive = true;
        },
        resetGame: (state) => {
            return { ...chainInitialState };
        },
        clearMessage: (state) => {
            state.message = '';
            state.messageType = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(startGame.fulfilled, (state, action) => {
                state.gameId = action.payload.game_id;
                state.difficulty = action.payload.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.winner = null;
                state.defeatReason = '';
                state.lastUserWord = '';
                setSuccessMessage(state, action.payload.message);

                if (action.payload.first_word) {
                    state.history = [{
                        word: action.payload.first_word,
                        definition: action.payload.first_definition || '시작 단어',
                        type: 'computer'
                    }];
                    state.currentWord = action.payload.first_word;
                } else {
                    state.history = [];
                }

                // 🔥 게임 시작 시 타이머 활성화
                state.turnTimeLeft = TURN_TIME;
                state.turnTimerActive = true;
            })
            .addCase(submitWord.pending, (state) => {
                setLoadingState(state, true);
                // 🔥 로딩 중에는 타이머 정지
                state.turnTimerActive = false;
            })
            .addCase(submitWord.fulfilled, (state, action) => {
                setLoadingState(state, false);

                // 🔥 실패 처리 (사전에 없는 단어, 규칙 위반 등)
                if (!action.payload.success) {
                    state.turnTimerActive = false; // 타이머 정지
                    setErrorMessage(state, action.payload.message);
                    state.defeatReason = action.payload.reason || action.payload.message;

                    // 🔥 패배 시 마지막 사용자 단어 저장 (여러 필드에서 추출)
                    const userWord = action.payload.user_word
                                    || action.payload.last_user_word
                                    || action.payload.user_wrong_word
                                    || '';

                    state.lastUserWord = userWord;

                    if (action.payload.game_over) {
                        state.gameOver = true;
                        state.winner = action.payload.winner || 'computer';
                        state.gameStarted = false;
                        state.turnTimeLeft = 0;
                    }
                    return;
                }

                // 🔥 단어 성공 제출
                if (action.payload.user_word) {
                    state.history.push({
                        word: action.payload.user_word,
                        definition: action.payload.user_definition,
                        type: 'user',
                    });
                    state.lastUserWord = action.payload.user_word;
                }

                // 🔥 컴퓨터 단어 추가
                if (action.payload.computer_word) {
                    state.history.push({
                        word: action.payload.computer_word,
                        definition: action.payload.computer_definition,
                        type: 'computer',
                    });
                    state.currentWord = action.payload.computer_word;
                    state.lastComputerWord = action.payload.computer_word;
                }
                // 🔥 게임이 계속되면 타이머 리셋
                if (action.payload.game_over) {
                    state.gameOver = true;
                    state.winner = action.payload.winner || 'user';
                    state.gameStarted = false;
                    state.turnTimerActive = false;
                    state.turnTimeLeft = 0;
                } else {
                    state.turnTimeLeft = TURN_TIME;
                    state.turnTimerActive = true;
                }
            })
            .addCase(submitWord.rejected, (state, action) => {
                setLoadingState(state, false);
                state.turnTimerActive = false;
                setErrorMessage(state, action.payload || '알 수 없는 오류가 발생했습니다.');
            })
            // ✅ endGame 처리
            .addCase(endGame.fulfilled, (state, action) => {
                console.log(`✅ 게임 ${action.payload} 삭제됨`);
            })
            .addCase(endGame.rejected, (state, action) => {
                console.error('게임 삭제 실패:', action.payload);
            })
            .addCase(restartGame.fulfilled, (state, action) => {
                // 게임 재시작 시 초기화
                state.gameId = action.payload.game_id;
                state.difficulty = action.payload.difficulty;
                state.gameStarted = true;
                state.gameOver = false;
                state.winner = null;
                state.defeatReason = '';
                state.lastUserWord = '';
                state.history = [];

                if (action.payload.first_word) {
                    state.history = [{
                        word: action.payload.first_word,
                        definition: action.payload.first_definition || '시작 단어',
                        type: 'computer'
                    }];
                    state.currentWord = action.payload.first_word;
                }

                // 타이머 리셋
                state.turnTimeLeft = TURN_TIME;
                state.turnTimerActive = true;

                setSuccessMessage(state, action.payload.message);
        });
    },
});

export const { startTurn, tickTurn, stopTurn, resetTurn, resetGame, clearMessage } = chainSlice.actions;
export default chainSlice.reducer;