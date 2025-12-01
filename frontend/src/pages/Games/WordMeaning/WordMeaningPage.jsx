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
import Bookmark from "@/components/common/Bookmark.jsx";
import {GAME_TABS} from "@/utils/tabs.js";
import grass from "@/assets/pattern1.png";

const WordMeaningPage = () => {
    const navigate = useNavigate();
    const { state, actions } = useSpellGame();
    const [answer, setAnswer] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const handleSubmit = () => {
        actions.submit(answer);
        setAnswer('');
    };
    const gameTabs = GAME_TABS;
    useAuthLoad()
    useCheckUser();
    return (
        <div className="relative z-20 w-[80%] max-w-[1000px] min-h-[80%] rounded-2xl
            bg-gradient-to-br from-[#cff09e]/80 to-[#f1ffe0]/80 overflow-visible
            flex items-center justify-center p-4">
            <div className="w-full max-w-4xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <GameButton
                        onClick={() => navigate('/games')}
                        className="bg-[#3d5919] text-white"
                    >
                        ← 목록으로
                    </GameButton>
                    <h1 className="font-juache text-3xl font-normal text-[#3d5919]">
                        초성 퀴즈
                    </h1>
                    <div className="w-20"></div>
                </div>
                <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-visible
                    flex flex-col relative z-20">
                    <div className="absolute top-1/2 -translate-y-1/2 right-[62px] translate-x-full z-10">
                        <Bookmark tabs={gameTabs} type="game" />
                    </div>

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
                    {/* 하단 가이드 */}
                    <div className="p-3">
                        <img
                            src={grass}
                            alt="grass"
                            className="w-full h-auto rounded-lg shadow-lg"
                        />
                    </div>
                </div>
                {/* 하단 정보 */}
                <div className="text-center text-xs text-gray-500 mt-2">
                    사전 데이터 제공: 국립국어원 한국어기초사전
                </div>
            </div>
        </div>
    );
};
export default WordMeaningPage;
