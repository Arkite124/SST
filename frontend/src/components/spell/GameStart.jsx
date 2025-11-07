// 📁 src/components/wordspell/GameStart.jsx
import React from 'react';
import GameButton from '@/components/common/GameButton.jsx';

const GameStart = ({ difficulty, onDifficultyChange, onStart, loading }) => {
    const difficulties = [
        { value: 'easy', label: '쉬움', emoji: '😊' },
        { value: 'medium', label: '보통', emoji: '😎' },
        { value: 'hard', label: '어려움', emoji: '🔥' }
    ];

    return (
        <div className="flex flex-col items-center space-y-6">
            <div className="text-center mb-4">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-gray-600 text-lg">
                    제시된 초성과 뜻을 보고 정답을 맞춰보세요!
                </p>
                <p className="text-gray-500 text-sm mt-2">
                    총 10문제 | 문제당 30초
                </p>
            </div>

            {/* 난이도 선택 */}
            <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    난이도 선택
                </label>
                <div className="flex gap-2">
                    {difficulties.map((diff) => (
                        <button
                            key={diff.value}
                            onClick={() => onDifficultyChange(diff.value)}
                            disabled={loading}
                            className={`
                                flex-1 py-3 px-4 rounded-lg font-semibold transition-all
                                ${difficulty === diff.value
                                ? 'bg-purple-600 text-white shadow-lg scale-105'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            <div className="text-2xl mb-1">{diff.emoji}</div>
                            <div className="text-sm">{diff.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            <GameButton
                onClick={onStart}
                disabled={loading}
                className="px-8 py-3 text-lg"
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>문제 생성 중...</span>
                    </div>
                ) : (
                    '🎮 게임 시작'
                )}
            </GameButton>
        </div>
    );
};

export default GameStart;