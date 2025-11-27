import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpellGame } from '@/hooks/useSpellGame';
import GameStart from '@/components/spell/GameStart';
import GamePlay from "@/components/spell/GamePlay.jsx";
import GameResult from '@/components/spell/GameResult';
import MessageDisplay from '@/components/common/Message';
import GameButton from '@/components/common/GameButton';
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import useCheckUser from "@/hooks/useCheckUser.jsx";
const WordMeaningPage = () => {
    const navigate = useNavigate();
    const { state, actions } = useSpellGame();
    const [answer, setAnswer] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const handleSubmit = () => {
        actions.submit(answer);
        setAnswer('');
    };
    useAuthLoad()
    useCheckUser();
    return (
        <div className="z-20 min-h-[70%] bg-gradient-to-br from-purple-50 to-pink-50 py-8">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl p-2">
                    <GameButton
                        onClick={() => navigate('/games')}
                        variant="secondary"
                        className="text-sm"
                    >
                        ← 목록으로
                    </GameButton>

                    <h1 className="text-4xl font-bold text-center mb-8 text-purple-600">
                        🎯 초성 퀴즈
                    </h1>

                    {/* 메시지 */}
                    {state.message && (
                        <MessageDisplay message={state.message} type={state.messageType || 'info'} />
                    )}

                    {/* 게임 시작 화면 */}
                    {!state.gameStarted && !state.gameOver && (
                        <GameStart
                            difficulty={difficulty}
                            onDifficultyChange={setDifficulty}
                            onStart={() => actions.start(difficulty)}
                            loading={state.loading}
                        />
                    )}
                    {/* 게임 플레이 화면 */}
                    {state.gameStarted && !state.gameOver && state.currentProblem && (
                        <GamePlay
                            currentProblem={state.currentProblem}
                            answer={answer}
                            onAnswerChange={setAnswer}
                            onSubmit={handleSubmit}
                            loading={state.loading}
                            currentQuestion={state.currentQuestionNumber}
                            totalQuestions={10}
                            timeLeft={state.timeLeft}
                            score={state.score}
                        />
                    )}

                    {/* 게임 결과 화면 */}
                    {state.gameOver && (
                        <GameResult
                            score={state.score}
                            totalQuestions={10}
                            onRestart={actions.restart}
                            onGoHome={actions.goHome}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
export default WordMeaningPage;
