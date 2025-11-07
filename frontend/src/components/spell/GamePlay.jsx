// 📁 src/components/spell/GamePlay.jsx
import React from 'react';
import InitialDisplay from './InitialDisplay';
import DefinitionDisplay from './DefinitionDisplay';
import AnswerInput from './AnswerInput';
import GameTimer from '../common/GameTimer'; // 🔥 공통 컴포넌트 사용

const GamePlay = ({
                      currentProblem,
                      answer,
                      onAnswerChange,
                      onSubmit,
                      loading,
                      currentQuestion,
                      totalQuestions,
                      timeLeft,
                      score
                  }) => {
    return (
        <div className="flex flex-col items-center space-y-4">
            {/* 문제 번호와 타이머 */}
            <div className="flex items-center justify-between w-full gap-4">
                <div className="text-lg text-gray-600 font-semibold flex-1 text-center">
                    문제 {currentQuestion} / {totalQuestions}
                </div>
                {/* 🔥 현재 점수 표시 */}
                <div className="text-lg font-bold text-purple-600">
                    🎯 {score}개
                </div>
                {/* 🔥 공통 GameTimer 사용 (detailed 버전) */}
                <GameTimer
                    timeLeft={timeLeft}
                    variant="detailed"
                    warningThreshold={10}
                    criticalThreshold={5}
                    showIcon={false}
                />
            </div>

            {/* 초성 표시 */}
            <InitialDisplay initial={currentProblem?.initial} />

            {/* 뜻 설명 */}
            <DefinitionDisplay definition={currentProblem?.definition} />

            {/* 답안 입력 */}
            <AnswerInput
                value={answer}
                onChange={onAnswerChange}
                onSubmit={onSubmit}
                loading={loading}
                disabled={loading || !answer.trim()}
            />
        </div>
    );
};

export default GamePlay;