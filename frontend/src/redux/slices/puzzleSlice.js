// src/store/slice/puzzleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { puzzleAPI } from '@/utils/puzzleApi.js';
import { formatScore, formatSimilarity } from '@/utils/format.js';

/* ----------------------------------------
   🔥 공통 Axios data 추출기
----------------------------------------- */
const extract = (payload) => payload?.data ?? payload;

/* ----------------------------------------
   🔥 퍼즐 생성
----------------------------------------- */
export const generatePuzzle = createAsyncThunk(
    'puzzle/generate',
    async ({ age, user_id }, { rejectWithValue }) => {
        try {
            const res = await puzzleAPI.generatePuzzle(age, user_id);
            return extract(res);
        } catch (error) {
            console.error('❌ 퍼즐 생성 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

/* ----------------------------------------
   🔥 정답 제출
----------------------------------------- */
export const submitAnswer = createAsyncThunk(
    'puzzle/submit',
    async ({ puzzle_id, answerBlocks }, { rejectWithValue }) => {
        try {
            const userAnswer = answerBlocks.map(b => b.word).join(' ');

            const res = await puzzleAPI.submitAnswer(puzzle_id, userAnswer);
            return extract(res);
        } catch (error) {
            console.error('❌ 답안 제출 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

/* ----------------------------------------
   🔥 힌트 요청
----------------------------------------- */
export const getHint = createAsyncThunk(
    'puzzle/hint',
    async ({ puzzle_id, answerBlocks }, { rejectWithValue }) => {
        try {
            const currentAnswer = answerBlocks.map(b => b.word).join(' ');
            const res = await puzzleAPI.getHint(puzzle_id, currentAnswer);
            return extract(res);
        } catch (error) {
            console.error('❌ 힌트 요청 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

/* ----------------------------------------
   🔥 초기 상태
----------------------------------------- */
const initialState = {
    age: 4,
    puzzle: null,
    sourceBlocks: [],
    answerBlocks: [],
    result: null,
    hints: null,
    currentQuestion: 0,
    totalQuestions: 10,
    correctCount: 0,
    score: 0,
    gameFinished: false,
    attempts: 0,
    maxAttempts: 2,
    levelHistory: [],
    loading: false,
    error: null,
};

/* ----------------------------------------
   🔥 섞기 함수
----------------------------------------- */
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/* ----------------------------------------
   🔥 Slice
----------------------------------------- */
const puzzleSlice = createSlice({
    name: 'puzzle',
    initialState,
    reducers: {
        setAge: (state, action) => { state.age = action.payload; },

        addBlockToAnswer: (state, action) => {
            const block = action.payload;
            state.sourceBlocks = state.sourceBlocks.filter(b => b.id !== block.id);
            state.answerBlocks.push(block);
            state.result = null;
            state.hints = null;
        },

        removeBlockFromAnswer: (state, action) => {
            const index = action.payload;
            const block = state.answerBlocks[index];
            state.answerBlocks.splice(index, 1);
            state.sourceBlocks.push(block);
            state.sourceBlocks.sort((a, b) => a.originalIndex - b.originalIndex);
        },

        resetAnswer: (state) => {
            state.sourceBlocks = [...state.sourceBlocks, ...state.answerBlocks].sort(
                (a, b) => a.originalIndex - b.originalIndex
            );
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
        },

        proceedToNext: (state, action) => {
            const { passed } = action.payload || { passed: false };

            state.levelHistory.push({
                age: state.age,
                passed,
                question: state.currentQuestion + 1,
            });

            state.currentQuestion += 1;
            state.attempts = 0;

            if (state.currentQuestion >= state.totalQuestions) {
                state.gameFinished = true;
            } else {
                if (passed) state.age = Math.min(13, state.age + 1);
                else state.age = Math.max(4, state.age - 1);
            }

            state.puzzle = null;
            state.sourceBlocks = [];
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
        },

        restartGame: (state) => {
            Object.assign(state, initialState);
        },

        resetPuzzle: (state) => {
            state.puzzle = null;
            state.sourceBlocks = [];
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
        },

        clearError: (state) => {
            state.error = null;
        },
    },

    /* ----------------------------------------
       🔥 Extra Reducers
    ----------------------------------------- */
    extraReducers: (builder) => {
        builder
            /* 🔥 퍼즐 생성 */
            .addCase(generatePuzzle.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.result = null;
                state.hints = null;
            })
            .addCase(generatePuzzle.fulfilled, (state, action) => {
                state.loading = false;

                const puzzle = action.payload;
                state.puzzle = puzzle;

                const pieces = puzzle?.pieces || [];

                state.sourceBlocks = pieces.map((piece, index) => ({
                    id: `${puzzle.puzzle_id}-${index}`,
                    word: piece.word || piece,
                    originalIndex: index,
                }));

                state.sourceBlocks = shuffleArray(state.sourceBlocks);
                state.answerBlocks = [];
            })
            .addCase(generatePuzzle.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '퍼즐 생성 실패';
            })

            /* 🔥 정답 제출 */
            .addCase(submitAnswer.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitAnswer.fulfilled, (state, action) => {
                state.loading = false;

                const data = action.payload;

                state.result = {
                    passed: data.passed || false,
                    message: data.message || data.feedback || '결과 없음',
                    similarity: formatSimilarity(data.similarity),
                    exact_match: data.exact_match || false,
                    original_sentence: data.original_sentence ?? null,
                    user_sentence: data.user_sentence ?? '',
                    score: formatScore(data.score),
                    feedback: data.feedback ?? '',
                };

                state.attempts += 1;

                if (data.passed) {
                    state.correctCount += 1;
                    state.score += data.score || 0;
                }
            })
            .addCase(submitAnswer.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '답안 제출 실패';
            })

            /* 🔥 힌트 */
            .addCase(getHint.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getHint.fulfilled, (state, action) => {
                state.loading = false;
                state.hints = action.payload;
            })
            .addCase(getHint.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '힌트 요청 실패';
            });
    },
});

export const {
    setAge,
    addBlockToAnswer,
    removeBlockFromAnswer,
    resetAnswer,
    proceedToNext,
    restartGame,
    resetPuzzle,
    clearError,
} = puzzleSlice.actions;

export default puzzleSlice.reducer;
