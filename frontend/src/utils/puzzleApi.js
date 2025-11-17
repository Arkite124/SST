// src/services/puzzleApi.js
import axiosInstance from "@/utils/axiosInstance.js";

export const puzzleAPI = {

    generatePuzzle: async (age, user_id) => {
        return await axiosInstance.post(
            '/games/puzzle/generate',
            { age, user_id },
            { withCredentials: true }
        );
    },

    submitAnswer: async (puzzleId, userAnswer) => {
        return await axiosInstance.post(
            '/games/puzzle/submit',
            {
                puzzle_id: puzzleId,
                user_answer: userAnswer,
            },
            { withCredentials: true }
        );
    },

    getHint: async (puzzleId, currentAnswer) => {
        return await axiosInstance.post(
            '/games/puzzle/hint',
            {
                puzzle_id: puzzleId,
                // ❗❗ 핵심 수정
                user_answer: currentAnswer,
            },
            { withCredentials: true }
        );
    }
};
