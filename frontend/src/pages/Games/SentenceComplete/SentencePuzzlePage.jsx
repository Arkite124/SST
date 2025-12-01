import React from 'react';
import { useNavigate } from 'react-router-dom';
import PuzzleGame from '@/components/puzzle/PuzzleGame';
import GameButton from '@/components/common/GameButton';
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import Bookmark from "@/components/common/Bookmark.jsx";
import {GAME_TABS} from "@/utils/tabs.js";
import grass from "@/assets/pattern1.png";

const SentencePuzzlePage = () => {
    const navigate = useNavigate();
    const gameTabs = GAME_TABS;
    useAuthLoad();
    return (
        <div className="relative z-20 w-[80%] max-w-[1000px] min-h-[80%] rounded-2xl
            bg-gradient-to-br from-[#cff09e]/80 to-[#f1ffe0]/80 overflow-visible
            flex items-center justify-center p-4">
            <div className="w-full max-w-4xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <GameButton
                        onClick={() => navigate('/games')}
                        variant="secondary"
                        className="text-sm"
                    >
                        ← 목록으로
                    </GameButton>
                    <h1 className="font-juache text-3xl font-normal text-[#3d5919]">
                        문장 퍼즐
                    </h1>
                    <div className="w-20"></div>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/*<p className="text-center text-green-100 mt-2">*/}
                    {/*    섞인 단어를 맞춰 문장을 완성하세요!*/}
                    {/*</p>*/}

                    {/* 메인 게임 컴포넌트 */}
                    <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-visible
                    flex flex-col relative z-20">

                        <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
                            <div className="w-full max-w-2xl">
                                <PuzzleGame />
                            </div>
                        </div>
                        <div className="p-3">
                            <img
                                src={grass}
                                alt="grass"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </div>
                    </div>
                    <div className="absolute top-[250px] right-[-200px] z-30">
                        <Bookmark tabs={gameTabs} type="game" />
                    </div>
                </div>

                {/*/!* 게임 가이드 *!/*/}
                {/*<div className="mt-6 bg-white rounded-xl p-6 shadow-lg">*/}
                {/*    <h3 className="text-xl font-bold text-gray-800 mb-4">*/}
                {/*        📋 게임 가이드*/}
                {/*    </h3>*/}
                {/*    <div className="space-y-3 text-gray-700">*/}
                {/*        <div className="flex items-start">*/}
                {/*            <span className="font-bold mr-2 text-green-600">1.</span>*/}
                {/*            <span>나이를 선택하여 적절한 난이도의 퍼즐을 받으세요.</span>*/}
                {/*        </div>*/}
                {/*        <div className="flex items-start">*/}
                {/*            <span className="font-bold mr-2 text-green-600">2.</span>*/}
                {/*            <span>섞인 단어 조각들을 클릭하거나 드래그하여 배열하세요.</span>*/}
                {/*        </div>*/}
                {/*        <div className="flex items-start">*/}
                {/*            <span className="font-bold mr-2 text-green-600">3.</span>*/}
                {/*            <span>어려울 때는 힌트 버튼을 눌러보세요.</span>*/}
                {/*        </div>*/}
                {/*        <div className="flex items-start">*/}
                {/*            <span className="font-bold mr-2 text-green-600">4.</span>*/}
                {/*            <span>완성한 문장을 제출하면 점수를 받을 수 있어요.</span>*/}
                {/*        </div>*/}
                {/*        <div className="flex items-start">*/}
                {/*            <span className="font-bold mr-2 text-green-600">5.</span>*/}
                {/*            <span>총 10문제를 풀면 최종 점수와 난이도 측정 결과를 볼 수 있어요.</span>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/*/!* 팁 *!/*/}
                {/*<div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">*/}
                {/*    <div className="flex items-start">*/}
                {/*        <span className="text-2xl mr-3">💡</span>*/}
                {/*        <div>*/}
                {/*            <h4 className="font-bold text-blue-800 mb-2">게임 팁</h4>*/}
                {/*            <ul className="text-sm text-blue-700 space-y-1">*/}
                {/*                <li>• 어린 나이일수록 쉬운 문장이 나옵니다</li>*/}
                {/*                <li>• 문장의 흐름을 생각하며 단어를 배치해보세요</li>*/}
                {/*                <li>• 주어 → 목적어 → 서술어 순서를 기억하세요</li>*/}
                {/*                <li>• 힌트는 최대 3번까지 사용할 수 있습니다</li>*/}
                {/*                <li>• 틀려도 2번까지 시도할 수 있어요</li>*/}
                {/*                <li>• 답안 영역을 클릭하면 단어를 다시 꺼낼 수 있어요</li>*/}
                {/*            </ul>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/*/!* 조작 방법 *!/*/}
                {/*<div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">*/}
                {/*    <div className="flex items-start">*/}
                {/*        <span className="text-2xl mr-3">🎮</span>*/}
                {/*        <div>*/}
                {/*            <h4 className="font-bold text-yellow-800 mb-2">조작 방법</h4>*/}
                {/*            <div className="text-sm text-yellow-700 space-y-2">*/}
                {/*                <div>*/}
                {/*                    <strong>방법 1 (클릭):</strong> 단어 블록을 클릭하면 답안 영역으로 이동합니다*/}
                {/*                </div>*/}
                {/*                <div>*/}
                {/*                    <strong>방법 2 (드래그):</strong> 단어 블록을 드래그하여 답안 영역에 놓을 수 있습니다*/}
                {/*                </div>*/}
                {/*                <div>*/}
                {/*                    <strong>단어 제거:</strong> 답안 영역의 단어를 클릭하면 다시 위로 돌아갑니다*/}
                {/*                </div>*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        </div>
    );
};

export default SentencePuzzlePage;