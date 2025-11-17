import axiosInstance from "@/utils/axiosInstance.js";

export const chainAPI = {
    startGame: async (difficulty = 'medium') => {
        return await axiosInstance.post('/games/wordchain/start', { difficulty });
    },

    submitWord: async (gameId, word, timeUp = false) => {
        return await axiosInstance.post('/games/wordchain/move', {
            game_id: gameId,
            word,
            time_up: timeUp,
        },{withCredentials: true});
    },

    restartGame: async (gameId) => {
        return await axiosInstance.post(`/games/wordchain/restart`, null, {
            params: { game_id: gameId },withCredentials:true
        });
    },

    getHistory: async (gameId) => {
        return await axiosInstance.get(`/games/wordchain/${gameId}/history`,{withCredentials: true});
    },

    endGame: async (gameId) => {
        return await axiosInstance.delete(`/games/wordchain/${gameId}`,{withCredentials: true});
    }
};