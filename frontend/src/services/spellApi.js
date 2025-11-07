// 📁 src/services/spellApi.js
import api from './api.js'

export const spellAPI = {
    // 게임 시작 - 🔥 함수명 변경
    startSpellGame: async (gameId, difficulty = 'medium') => {
        try {
            const response = await api.post('/games/wordspell/start', {
                game_id: gameId,
                difficulty
            },{withCredentials: true});
            return { data: response };
        } catch (error) {
            console.error('❌ 게임 시작 API 오류:', error);
            throw error;
        }
    },

    // 정답 제출
    submitWord: async (gameId, answer) => {
        try {
            const response = await api.post('/games/wordspell/submit', {
                game_id: gameId,
                answer: answer.trim()
            },{withCredentials: true});
            return { data: response };
        } catch (error) {
            console.error('❌ 정답 제출 API 오류:', error);
            throw error;
        }
    },

    // 다시 시작 - 🔥 함수명 변경
    restartSpellGame: async (gameId, difficulty = 'medium') => {
        try {
            const response = await api.post('/games/wordspell/start', {
                game_id: gameId,
                difficulty
            },{withCredentials: true});
            return { data: response };
        } catch (error) {
            console.error('❌ 게임 재시작 API 오류:', error);
            throw error;
        }
    }
};