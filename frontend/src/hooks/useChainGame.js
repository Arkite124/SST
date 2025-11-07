// 📁 src/hooks/useChainGame.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    startGame,
    submitWord,
    tickTurn,
    stopTurn,
    clearMessage,
    resetGame
} from '@/redux/slices/chainSlice.js';

export const useChainGame = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const state = useSelector((state) => state.chain);

    // 타이머
    useEffect(() => {
        if (state.gameStarted && !state.gameOver && state.turnTimerActive && !state.loading) {
            const timer = setInterval(() => dispatch(tickTurn()), 1000);
            return () => clearInterval(timer);
        }
    }, [state.gameStarted, state.gameOver, state.turnTimerActive, state.loading, dispatch]);

    // 시간 초과 처리
    useEffect(() => {
        if (state.turnTimeLeft === 0 && state.gameStarted && !state.gameOver && !state.loading) {
            dispatch(stopTurn());
            dispatch(submitWord({ gameId: state.gameId, word: '', timeUp: true }));
        }
    }, [state.turnTimeLeft, state.gameStarted, state.gameOver, state.loading, state.gameId, dispatch]);

    // 게임 액션들
    const actions = {
        start: (difficulty) => {
            dispatch(startGame(difficulty));
        },

        submit: (word) => {
            if (!word.trim()) return;
            dispatch(submitWord({
                gameId: state.gameId,
                word: word.trim()
            }));
        },

        goHome: () => {
            dispatch(resetGame());
            navigate('/');
        }
    };

    return { state, actions };
};