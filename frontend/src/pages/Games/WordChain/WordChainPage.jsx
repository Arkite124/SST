import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainGame } from '@/hooks/useChainGame';
import DifficultySelector from '@/components/chain/DifficultySelector';
import GameBoard from '@/components/chain/GameBoard';
import WordInput from '@/components/chain/WordInput';
import GameResult from '@/components/chain/GameResult';
import GameTimer from '@/components/common/GameTimer';
import Notification from '@/components/common/Notification';
import GameButton from '@/components/common/GameButton.jsx';
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import useCheckUser from "@/hooks/useCheckUser.jsx";
import grass from "@/assets/pattern1.png"
import Bookmark from "@/components/common/Bookmark.jsx"
import {GAME_TABS} from "@/utils/tabs.js";

const WordChainPage = () => {
    const navigate = useNavigate();
    const { state, actions } = useChainGame();
    const gameTabs = GAME_TABS;
    useAuthLoad()
    useCheckUser();
    return (
        <>
            <div className="relative z-20 w-[80%] max-w-[1000px] min-h-[80%] rounded-2xl
            bg-gradient-to-br from-[#cff09e]/80 to-[#f1ffe0]/80 overflow-visible
            flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-full flex flex-col">
                    {/* 헤더 */}
                    <div className="flex justify-between items-center mb-2">
                        <GameButton
                            onClick={() => navigate('/games')}
                            className="bg-[#3d5919] text-white"
                        >
                            ← 목록으로
                        </GameButton>
                        <h1 className="font-juache text-3xl font-normal text-[#3d5919]">
                            끝말잇기
                        </h1>
                        <div className="w-20"></div>
                    </div>
                    {/* 메인 콘텐츠 */}
                    <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-visible
                    flex flex-col relative z-20">
                        <div className="absolute top-1/2 -translate-y-1/2 right-[62px] translate-x-full z-10">
                            <Bookmark tabs={gameTabs} type="game" />
                        </div>
                        {/* 게임 영역 */}
                        <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
                            <div className="w-full max-w-2xl">
                                {/* 난이도 선택 */}
                                {!state.gameStarted && !state.gameOver && (
                                    <DifficultySelector onSelect={actions.start} />
                                )}

                                {/* 게임 진행 중 */}
                                {state.gameStarted && !state.gameOver && (
                                    <>
                                        <GameTimer
                                            timeLeft={state.turnTimeLeft}
                                            variant="simple"
                                            warningThreshold={5}
                                            criticalThreshold={3}
                                        />
                                        <GameBoard />
                                        <WordInput />

                                        <Notification
                                            message={state.message}
                                            type={state.messageType}
                                            position="top"
                                            variant="toast"
                                            duration={3000}
                                        />
                                    </>
                                )}

                                {/* 게임 종료 */}
                                {state.gameOver && <GameResult onGoHome={actions.goHome} />}
                            </div>
                        </div>
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
        </>
    );
};

export default WordChainPage;