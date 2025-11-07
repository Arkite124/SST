// src/services/puzzleApi.js
import api from './api';
import {useSelector} from "react-redux";

export const puzzleAPI = {
    generatePuzzle: async (age,user_id) => {
    return await api.post('/games/puzzle/generate', { age,user_id:user_id},{withCredentials: true});
    },

    submitAnswer: async (puzzleId, userAnswer) => {
    return await api.post('/games/puzzle/submit', {
        puzzle_id: puzzleId,
        user_answer: userAnswer,
        },{withCredentials: true})
    },

    getHint: async (puzzleId, currentAnswer) => {
        return await api.post('/games/puzzle/hint', {
            puzzle_id: puzzleId,
            current_answer: currentAnswer,
        },{withCredentials: true});
    }
};