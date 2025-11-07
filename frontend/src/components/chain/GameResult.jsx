import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { restartGame } from '@/redux/slices/chainSlice.js';
import GameButton from '../common/GameButton';

const GameResult = () => {
    const dispatch = useDispatch();
    const { winner, history, message, defeatReason } = useSelector((state) => state.chain);

    // 🔥 승리/패배 메시지
    const getWinnerMessage = () => {
        if (winner === 'user') {
            return '🎉 당신의 승리! 컴퓨터가 단어를 찾지 못했어요!';
        } else if (winner === 'computer') {
            return '😢 컴퓨터의 승리!';
        }
        return message;
    };

    return (
        <div className="text-center p-8">
            <h2 className="text-4xl font-bold mb-4">{getWinnerMessage()}</h2>

            {/* 🔥 패배 이유 - 백엔드 메시지 그대로 표시 */}
            {winner === 'computer' && defeatReason && (
                <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 mb-6">
                    <p className="text-xl text-red-700 font-semibold mb-2">
                        💥 패배 이유
                    </p>
                    <p className="text-lg text-red-600 whitespace-pre-line">
                        {defeatReason}
                    </p>
                </div>
            )}

            <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <p className="text-lg mb-2">
                    <strong>총 턴 수:</strong> {history.length}개
                </p>
                <p className="text-lg">
                    <strong>사용한 단어:</strong>
                </p>
                <p className="mt-2">{history.map((h) => h.word).join(' → ')}</p>
            </div>

            {/* 🔥 버튼 */}
            <GameButton onClick={() => dispatch(restartGame())}>
                같은 난이도로 다시 시작
            </GameButton>

            <GameButton
                variant="secondary"
                onClick={() => window.location.reload()}
                className="ml-2"
            >
                난이도 변경
            </GameButton>
        </div>
    );
};

export default GameResult;