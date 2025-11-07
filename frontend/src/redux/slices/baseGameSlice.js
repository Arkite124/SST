// src/store/baseGameSlice.js
/**
 * 모든 게임의 공통 상태와 리듀서를 정의하는 베이스 팩토리
 */

export const createBaseGameState = (customInitialState = {}) => ({
    // 공통 게임 상태
    gameId: null,
    gameStarted: false,
    gameOver: false,
    loading: false,
    error: null,

    // 메시지 시스템
    message: '',
    messageType: '', // 'success' | 'error' | 'info' | 'warning'

    // 점수 시스템
    score: 0,
    currentQuestion: 0,
    totalQuestions: 10,

    // 커스텀 상태 병합
    ...customInitialState,
});

export const createBaseGameReducers = () => ({
    // 메시지 관리
    setMessage: (state, action) => {
        const { message, type = 'info' } = action.payload;
        state.message = message;
        state.messageType = type;
    },

    clearMessage: (state) => {
        state.message = '';
        state.messageType = '';
    },

    // 에러 관리
    setError: (state, action) => {
        state.error = action.payload;
        state.message = action.payload;
        state.messageType = 'error';
    },

    clearError: (state) => {
        state.error = null;
    },

    // 게임 상태 관리
    setGameStarted: (state, action) => {
        state.gameStarted = action.payload;
    },

    setGameOver: (state, action) => {
        state.gameOver = action.payload;
        state.gameStarted = false;
    },

    // 전체 게임 리셋
    resetGame: (state, action) => {
        const initialState = action.payload || {};
        return createBaseGameState(initialState);
    },
});

/**
 * AsyncThunk의 공통 pending/fulfilled/rejected 핸들러
 */
export const createBaseAsyncHandlers = (builder, thunk, options = {}) => {
    const {
        onPending = (state) => {
            state.loading = true;
            state.error = null;
        },
        onFulfilled = (state, action) => {
            state.loading = false;
        },
        onRejected = (state, action) => {
            state.loading = false;
            state.error = action.error.message;
            state.message = action.error.message;
            state.messageType = 'error';
        },
    } = options;

    builder
        .addCase(thunk.pending, onPending)
        .addCase(thunk.fulfilled, onFulfilled)
        .addCase(thunk.rejected, onRejected);

    return builder;
};

/**
 * 로딩 상태 관리 헬퍼
 */
export const setLoadingState = (state, isLoading) => {
    state.loading = isLoading;
    if (isLoading) {
        state.error = null;
    }
};

/**
 * 성공 메시지 헬퍼
 */
export const setSuccessMessage = (state, message) => {
    state.message = message;
    state.messageType = 'success';
};

/**
 * 에러 메시지 헬퍼
 */
export const setErrorMessage = (state, error) => {
    state.error = typeof error === 'string' ? error : error.message;
    state.message = state.error;
    state.messageType = 'error';
};

export default {
    createBaseGameState,
    createBaseGameReducers,
    createBaseAsyncHandlers,
    setLoadingState,
    setSuccessMessage,
    setErrorMessage,
};