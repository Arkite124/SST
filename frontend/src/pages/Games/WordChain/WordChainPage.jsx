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

const WordChainPage = () => {
    const navigate = useNavigate();
    const { state, actions } = useChainGame();
    useAuthLoad()
    useCheckUser();
    return (
        <div className="z-20 min-h-[70%] bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden flex items-center justify-center p-4">
            <div className="w-full max-w-4xl h-full flex flex-col">
                {/* 헤더 */}
                <div className="flex justify-between items-center mb-2">
                    <GameButton
                        onClick={() => navigate('/games')}
                        variant="secondary"
                        className="text-sm"
                    >
                        ← 목록으로
                    </GameButton>
                    <h1 className="text-2xl font-bold text-green-700">
                        끝말잇기 게임
                    </h1>
                    <div className="w-20"></div>
                </div>

                {/* 메인 콘텐츠 */}
                <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    {/* 게임 영역 */}
                    <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
                        <div className="w-full max-w-2xl">
                            {/* 난이도 선택 */}
                            {!state.gameStarted && (
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
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 border-t border-green-100">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <h4 className="font-bold text-green-700 mb-2">💡 게임 팁</h4>
                                <ul className="text-green-600 space-y-1">
                                    <li>• 끝말을 이어서 단어를 입력하세요</li>
                                    <li>• 시간 내에 답을 제출하세요</li>
                                    <li>• 한방 단어는 피하는 게 좋아요</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-green-700 mb-2">🎮 게임 방법</h4>
                                <ul className="text-green-600 space-y-1">
                                    <li>• 난이도를 선택하고 시작</li>
                                    <li>• 제시된 단어로 끝말잇기</li>
                                    <li>• 국립국어원 사전 단어만 인정</li>
                                </ul>
                            </div>
                        </div>
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

export default WordChainPage;