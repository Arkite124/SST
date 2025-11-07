// 📁 src/pages/WordChainPage.jsx
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
import {useSelector} from "react-redux";
import {useEffect} from "react";
import {toast} from "react-toastify";

const WordChainPage = () => {
    const navigate = useNavigate();
    const { state, actions } = useChainGame();
    useAuthLoad()

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* 헤더 */}
            <GameButton
                onClick={() => navigate('/')}
                variant="secondary"
                className="text-sm mb-4"
            >
                ← 홈으로
            </GameButton>

            <h1 className="text-4xl font-bold text-center mb-6 text-blue-600">
                🎮 끝말잇기 게임
            </h1>
            <p className="text-center text-gray-600 mb-8">
                사전 데이터 제공: 국립국어원 한국어기초사전
            </p>

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
    );
};

export default WordChainPage;