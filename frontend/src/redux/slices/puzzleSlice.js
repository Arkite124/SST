// src/store/slice/puzzleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { puzzleAPI } from '@/services/puzzleApi.js';
export const generatePuzzle = createAsyncThunk(
    'puzzle/generate',
    async ({ age,user_id }, { rejectWithValue }) => {
        try {
            const data = await puzzleAPI.generatePuzzle(age,user_id);
            return data;
        } catch (error) {
            console.error('❌ 퍼즐 생성 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const submitAnswer = createAsyncThunk(
    'puzzle/submit',
    async ({ puzzleId, answerBlocks }, { rejectWithValue }) => {
        try {
            const userAnswer = answerBlocks.map(block => block.word).join(' ');
            console.log('📤 제출:', { puzzleId, userAnswer });

            const data = await puzzleAPI.submitAnswer(puzzleId, userAnswer);
            console.log('📥 응답:', data);

            return data;
        } catch (error) {
            console.error('❌ 답안 제출 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const getHint = createAsyncThunk(
    'puzzle/hint',
    async ({ puzzleId, answerBlocks }, { rejectWithValue }) => {
        try {
            const currentAnswer = answerBlocks.map(block => block.word).join(' ');
            const data = await puzzleAPI.getHint(puzzleId, currentAnswer);
            return data;
        } catch (error) {
            console.error('❌ 힌트 요청 에러:', error);
            return rejectWithValue(error.message);
        }
    }
);

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

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const puzzleSlice = createSlice({
    name: 'puzzle',
    initialState,
    reducers: {
        setAge: (state, action) => {
            state.age = action.payload;
        },

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
            state.sourceBlocks = [
                ...state.sourceBlocks,
                ...state.answerBlocks
            ].sort((a, b) => a.originalIndex - b.originalIndex);
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
        },

        proceedToNext: (state, action) => {
            const { passed } = action.payload || { passed: false };

            state.levelHistory.push({
                age: state.age,
                passed: passed,
                question: state.currentQuestion + 1
            });

            state.currentQuestion += 1;
            state.attempts = 0;

            if (state.currentQuestion >= state.totalQuestions) {
                state.gameFinished = true;
            } else {
                if (passed) {
                    state.age = Math.min(13, state.age + 1);
                } else {
                    state.age = Math.max(4, state.age - 1);
                }
            }

            state.puzzle = null;
            state.sourceBlocks = [];
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
        },

        restartGame: (state) => {
            state.age = 4;
            state.currentQuestion = 0;
            state.correctCount = 0;
            state.score = 0;
            state.attempts = 0;
            state.gameFinished = false;
            state.levelHistory = [];
            state.puzzle = null;
            state.sourceBlocks = [];
            state.answerBlocks = [];
            state.result = null;
            state.hints = null;
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
    extraReducers: (builder) => {
        builder
            // 퍼즐 생성
            .addCase(generatePuzzle.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.result = null;
                state.hints = null;
            })
            .addCase(generatePuzzle.fulfilled, (state, action) => {
                state.loading = false;
                state.puzzle = action.payload;

                const pieces = action.payload.pieces || [];
                state.sourceBlocks = pieces.map((piece, index) => ({
                    id: `${action.payload.puzzle_id}-${index}`,
                    word: piece.word || piece,
                    originalIndex: index,
                }));

                state.sourceBlocks = shuffleArray(state.sourceBlocks);
                state.answerBlocks = [];
            })
            .addCase(generatePuzzle.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '퍼즐 생성에 실패했습니다.';
                console.error('퍼즐 생성 실패:', action.payload);
            })

            // 답안 제출
            .addCase(submitAnswer.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitAnswer.fulfilled, (state, action) => {
                state.loading = false;

                // ✅ 백엔드 응답 데이터를 그대로 사용
                const response = action.payload || {};
                console.log('✅ 제출 성공 (백엔드 응답):', response);

                // ✅ 백엔드 응답을 그대로 저장
                state.result = {
                    passed: response.passed || false,
                    message: response.message || response.feedback || '결과 없음',
                    similarity: response.similarity || 0,
                    exact_match: response.exact_match || false,
                    original_sentence: response.original_sentence || null,
                    user_sentence: response.user_sentence || '',
                    score: response.score || 0,  // ✅ 백엔드 계산 점수
                    feedback: response.feedback || ''
                };

                state.attempts += 1;

                // ✅ 정답일 때만 백엔드에서 계산한 점수를 누적
                if (response.passed) {
                    state.correctCount += 1;
                    // ✅ 백엔드 score를 그대로 사용 (프론트엔드에서 재계산 안 함)
                    const earnedScore = response.score || 0;
                    state.score += earnedScore;

                    console.log(`✅ 점수 획득: ${earnedScore}점 (누적: ${state.score}점)`);
                }
            })
            .addCase(submitAnswer.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '답안 제출에 실패했습니다.';
                console.error('답안 제출 실패:', action.payload);
                alert(`에러 발생: ${state.error}`);
            })

            // 힌트 요청
            .addCase(getHint.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getHint.fulfilled, (state, action) => {
                state.loading = false;
                // ✅ 백엔드 힌트 응답을 그대로 저장
                state.hints = action.payload;
                console.log('✅ 힌트 수신:', action.payload);
            })
            .addCase(getHint.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || '힌트 요청에 실패했습니다.';
                console.error('힌트 요청 실패:', action.payload);
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