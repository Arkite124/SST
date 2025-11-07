import api from './api';

export const chainAPI = {
    startGame: async (difficulty = 'medium') => {
        return await api.post('/games/wordchain/start', { difficulty });
    },

    submitWord: async (gameId, word, timeUp = false) => {
        return await api.post('/games/wordchain/move', {
            game_id: gameId,
            word,
            time_up: timeUp,
        },{withCredentials: true});
    },

    restartGame: async (gameId) => {
        return await api.post(`/games/wordchain/restart`, null, {
            params: { game_id: gameId },withCredentials:true
        });
    },

    getHistory: async (gameId) => {
        return await api.get(`/games/wordchain/${gameId}/history`,{withCredentials: true});
    },

    endGame: async (gameId) => {
        return await api.delete(`/games/wordchain/${gameId}`,{withCredentials: true});
    }
};