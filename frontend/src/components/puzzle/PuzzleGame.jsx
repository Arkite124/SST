// src/components/puzzle/PuzzleGame.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks.js';
import {
    addBlockToAnswer,
    removeBlockFromAnswer,
    resetAnswer,
    submitAnswer,
    getHint,
    clearError,
    proceedToNext,
    restartGame,
    generatePuzzle,
} from '@/redux/slices/puzzleSlice';
import PuzzleBlock from './PuzzleBlock';
import AnswerArea from './AnswerArea';
import {useSelector} from "react-redux";

const PuzzleGame = () => {
    const dispatch = useAppDispatch();
    const {
        puzzle, sourceBlocks, answerBlocks, result, hints,
        loading, error, age, currentQuestion, totalQuestions,
        correctCount, score, gameFinished, attempts, maxAttempts, levelHistory,
    } = useAppSelector((state) => state.puzzle);
    const auth = useSelector((state) => state.auth);
    const { user } = auth;
    const user_id=user.id
    useEffect(() => {
        if (error) {
            alert(error);
            dispatch(clearError());
        }
    }, [error, dispatch]);
    const handleAddBlock = (block) => dispatch(addBlockToAnswer(block));
    const handleRemoveBlock = (index) => dispatch(removeBlockFromAnswer(index));
    const handleSubmit = () => {
        if (answerBlocks.length === 0) {
            alert('단어를 배치해주세요.');
            return;
        }
        dispatch(submitAnswer({ puzzleId: puzzle.puzzle_id, answerBlocks }));
    };
    const handleGetHint = () => dispatch(getHint({ puzzleId: puzzle.puzzle_id, answerBlocks }));
    const handleReset = () => dispatch(resetAnswer());
    const handleNextQuestion = () => {
        const passed = result?.passed || false;
        dispatch(proceedToNext({ passed }));
        if (currentQuestion + 1 < totalQuestions) {
            setTimeout(() => dispatch(generatePuzzle({ age,user_id:user.id })), 100);
        }
    };
    const handleRestartGame = () => dispatch(restartGame());

    // 게임 종료 화면
    if (gameFinished) {
        const accuracy = ((correctCount / totalQuestions) * 100).toFixed(1);
        const avgAge = Math.round(levelHistory.reduce((sum, h) => sum + h.age, 0) / levelHistory.length);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-10 max-w-lg w-full shadow-2xl text-center">
                    <h2 className="text-4xl font-bold text-purple-600 mb-8">🎉 게임 종료!</h2>

                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 rounded-xl mb-6">
                        <h3 className="text-lg opacity-90 mb-2">측정된 난이도</h3>
                        <p className="text-4xl font-bold">{avgAge}세 수준</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-100 p-5 rounded-lg">
                            <span className="block text-sm text-gray-600 mb-2">총 문제 수</span>
                            <span className="block text-2xl font-bold">{totalQuestions}개</span>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-5 rounded-lg">
                            <span className="block text-sm opacity-90 mb-2">맞춘 문제</span>
                            <span className="block text-2xl font-bold">{correctCount}개</span>
                        </div>
                        <div className="bg-gray-100 p-5 rounded-lg">
                            <span className="block text-sm text-gray-600 mb-2">정답률</span>
                            <span className="block text-2xl font-bold">{accuracy}%</span>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-5 rounded-lg">
                            <span className="block text-sm opacity-90 mb-2">최종 점수</span>
                            <span className="block text-3xl font-bold">{score}점</span>
                        </div>
                    </div>

                    <p className="text-xl font-bold mb-6">
                        {correctCount === totalQuestions ? '완벽해요! 모든 문제를 맞혔어요!' :
                            correctCount >= totalQuestions * 0.8 ? '훌륭해요! 정말 잘했어요!' :
                                correctCount >= totalQuestions * 0.6 ? '잘했어요! 조금만 더 노력하면 완벽해요!' :
                                    '괜찮아요! 다시 도전해봐요!'}
                    </p>

                    <button
                        onClick={handleRestartGame}
                        className="bg-purple-600 text-white px-10 py-3 rounded-lg text-lg font-bold hover:bg-purple-700 transition-all hover:-translate-y-1"
                    >
                        다시 시작하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-4xl font-bold text-center text-purple-600 mb-8">🧩 동화 문장 퍼즐</h1>

            {/* 게임 시작 전 설정 */}
            {currentQuestion === 0 && !puzzle && (
                <div className="flex gap-5 mb-8 justify-center items-center flex-wrap">
                    <select
                        value={age}
                        onChange={(e) => dispatch({ type: 'puzzle/setAge', payload: Number(e.target.value) })}
                        disabled={loading}
                        className="px-5 py-3 border-2 border-purple-400 rounded-lg text-lg transition-all focus:border-purple-600 focus:outline-none"
                    >
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((a) => (
                            <option key={a} value={a}>{a}세</option>
                        ))}
                    </select>
                    <button
                        onClick={() => dispatch(generatePuzzle({ age,user_id }))}
                        disabled={loading}
                        className="bg-purple-600 text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-purple-700 transition-all disabled:opacity-50 hover:-translate-y-1"
                    >
                        {loading ? '로딩 중...' : '새 퍼즐 시작'}
                    </button>
                </div>
            )}

            {/* 진행 상태 */}
            {puzzle && (
                <div className="bg-white p-5 rounded-xl mb-6 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-bold">문제 {currentQuestion + 1} / {totalQuestions}</span>
                        <span className="text-purple-600 font-semibold">{age}세 수준</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 퍼즐 정보 */}
            {puzzle && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                    <div className="mb-2"><strong>동화:</strong> {puzzle.title}</div>
                    <div><strong>단어 수:</strong> {puzzle.word_count}개</div>
                </div>
            )}

            {/* 단어 블록들 */}
            {puzzle ? (
                <div className="bg-gray-100 p-8 rounded-xl min-h-[auto] mb-6 flex flex-wrap gap-4 justify-center">
                    {sourceBlocks && sourceBlocks.length > 0 ? (
                        sourceBlocks.map((block) => (
                            <PuzzleBlock
                                key={block.id}
                                block={block}
                                onClick={() => handleAddBlock(block)}
                                type="source"
                            />
                        ))
                    ) : (
                        <div className="text-gray-400 py-12">단어를 준비하는 중...</div>
                    )}
                </div>
            ) : (
                <div className="bg-gray-100 p-8 rounded-xl min-h-[auto] mb-6 flex items-center justify-center">
                    <div className="text-gray-400 text-lg">
                        {currentQuestion === 0 ? '새 퍼즐을 시작해주세요' : '로딩 중...'}
                    </div>
                </div>
            )}

            {/* 답안 영역 */}
            {puzzle && (
                <>
                    <AnswerArea blocks={answerBlocks} onRemove={handleRemoveBlock} onDrop={handleAddBlock} />

                    {/* 시도 횟수 */}
                    {result && !result.passed && attempts < maxAttempts && (
                        <div className="text-center py-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-yellow-800 font-bold mb-4">
                            남은 시도: {maxAttempts - attempts}회
                        </div>
                    )}

                    {/* 컨트롤 버튼들 */}
                    <div className="flex gap-4 justify-center mb-6 flex-wrap">
                        <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all disabled:opacity-50">
                            정답 확인
                        </button>
                        <button onClick={handleGetHint} disabled={loading} className="px-8 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-all disabled:opacity-50">
                            힌트
                        </button>
                        <button onClick={handleReset} className="px-8 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all">
                            다시하기
                        </button>

                        {result && (result.passed || attempts >= maxAttempts) && (
                            <button onClick={handleNextQuestion} className="px-8 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all">
                                다음 문제
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* 결과 표시 */}
            {result && (
                <div className={`p-6 rounded-xl text-center mb-6 border-2 ${result.passed ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
                    <div className="text-xl font-bold mb-2">{result.message}</div>
                    {result.passed ? (
                        <small className="text-sm">정답: {result.original_sentence}</small>
                    ) : (
                        <div className="space-y-2">
                            <div>당신의 답: {result.user_sentence}</div>
                            {attempts < maxAttempts ? (
                                <p className="font-bold">💪 한 번 더 도전해보세요!</p>
                            ) : (
                                <div>정답: {result.original_sentence}</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 힌트 표시 */}
            {hints && (
                <div className="bg-yellow-50 p-5 rounded-lg border-2 border-yellow-200">
                    <strong className="text-yellow-800">💡 힌트</strong>
                    {hints.hints && hints.hints.length > 0 ? (
                        <ul className="mt-3 space-y-1">
                            {hints.hints.map((hint, index) => (
                                <li key={index} className="text-yellow-700">{hint.message}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-yellow-700">모든 단어가 올바른 위치에 있습니다!</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PuzzleGame;