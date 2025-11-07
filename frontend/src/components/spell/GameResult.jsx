// 📁 src/components/wordspell/GameResult.jsx
import React from 'react';
import GameButton from '@/components/common/GameButton.jsx';

const GameResult = ({ score, totalQuestions, onRestart, onGoHome }) => {
    const percentage = (score / totalQuestions) * 100;

    let message = '';
    let emoji = '';

    if (percentage === 100) {
        message = '완벽해요! 🎉';
        emoji = '🏆';
    } else if (percentage >= 80) {
        message = '아주 잘했어요!';
        emoji = '🌟';
    } else if (percentage >= 60) {
        message = '잘했어요!';
        emoji = '👍';
    } else if (percentage >= 40) {
        message = '좋은 시도였어요!';
        emoji = '💪';
    } else {
        message = '다시 도전해보세요!';
        emoji = '📚';
    }

    return (
        <div className="text-center space-y-4">
            <div className="text-6xl mb-4">{emoji}</div>
            <h2 className="text-3xl font-bold text-gray-800">게임 종료!</h2>
            <p className="text-xl text-gray-600">{message}</p>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-xl">
                <p className="text-2xl font-bold text-purple-700">
                    점수: {score} / {totalQuestions}
                </p>
                <p className="text-lg text-gray-600 mt-2">
                    정답률: {percentage.toFixed(0)}%
                </p>
            </div>
            <div className="flex justify-center space-x-3 mt-6">
                <GameButton onClick={onRestart} className="px-6 py-2">
                    🔄 다시하기
                </GameButton>
                <GameButton onClick={onGoHome} className="px-6 py-2 bg-gray-500 hover:bg-gray-600">
                    🏠 홈으로
                </GameButton>
            </div>
        </div>
    );
};

export default GameResult;
