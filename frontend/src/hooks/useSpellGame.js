// 📁 src/hooks/useSpellGame.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    startSpellGame,
    submitSpellAnswer,
    restartSpellGame,
    tickTimer,
    clearMessage,
    resetGameState
} from '@/redux/slices/spellSlice.js';

export const useSpellGame = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const state = useSelector((state) => state.spell);

    // 타이머
    useEffect(() => {
        if (state.gameStarted && !state.gameOver && state.timerActive) {
            const timer = setInterval(() => dispatch(tickTimer()), 1000);
            return () => clearInterval(timer);
        }
    }, [state.gameStarted, state.gameOver, state.timerActive, dispatch]);

    // 메시지 자동 삭제
    useEffect(() => {
        if (state.message && !state.gameOver) {
            const timer = setTimeout(() => dispatch(clearMessage()), 3000);
            return () => clearTimeout(timer);
        }
    }, [state.message, state.gameOver, dispatch]);

    // 게임 액션들
    const actions = {
        start: (difficulty) => {
            const gameId = `spell-${Date.now()}`;
            dispatch(startSpellGame({ gameId, difficulty }));
        },

        submit: (answer) => {
            if (!answer.trim()) return;
            dispatch(submitSpellAnswer({
                gameId: state.gameId,
                answer: answer.trim(),
                usedProblems: state.usedProblems
            }));
        },

        restart: () => {
            const gameId = `spell-${Date.now()}`;
            dispatch(restartSpellGame({
                gameId,
                difficulty: state.difficulty
            }));
        },

        goHome: () => {
            dispatch(resetGameState());
            navigate('/');
        }
    };

    return { state, actions };
};