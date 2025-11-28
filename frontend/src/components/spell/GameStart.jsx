import React from 'react';
import GameButton from '@/components/common/GameButton.jsx';
import DifficultySelector from "@/components/chain/DifficultySelector.jsx";

const GameStart = ({ onDifficultyChange, onStart, loading }) => {

    return (
        <div className="flex flex-col items-center space-y-6 h-full justify-center">
            {/*<div className="text-center mb-4">*/}
            {/*    <p className="text-gray-600 text-lg">*/}
            {/*        제시된 초성과 뜻을 보고 정답을 맞춰보세요!*/}
            {/*    </p>*/}
            {/*    <p className="text-gray-500 text-sm mt-2">*/}
            {/*        총 10문제 | 문제당 30초*/}
            {/*    </p>*/}
            {/*</div>*/}

            {/* 난이도 선택 */}
            <div className="w-full max-w-2xl">
                    <DifficultySelector onSelect={onDifficultyChange} />
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
                    '게임 시작'
                )}
            </GameButton>
        </div>
    );
};

export default GameStart;