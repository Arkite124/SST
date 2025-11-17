// 📁 src/utils/spellApi.js
import axiosInstance from "@/utils/axiosInstance.js";

export const spellAPI = {
    // 게임 시작
    startSpellGame: async (gameId, difficulty = "medium") => {
        try {
            const res = await axiosInstance.post(
                "/games/wordspell/start",
                {
                    game_id: gameId,
                    difficulty,
                }
            );
            return res.data; // 🔥 axios.data만 반환
        } catch (error) {
            console.error(" 게임 시작 API 오류:", error);
            throw error;
        }
    },

    // 정답 제출
    submitWord: async (gameId, answer) => {
        try {
            const res = await axiosInstance.post(
                "/games/wordspell/submit",
                {
                    game_id: gameId,
                    answer: answer.trim(),
                }
            );
            return res.data; // 🔥 axios.data만 반환
        } catch (error) {
            console.error("❌ 정답 제출 API 오류:", error);
            throw error;
        }
    },

    // 다시 시작
    restartSpellGame: async (gameId, difficulty = "medium") => {
        try {
            const res = await axiosInstance.post(
                "/games/wordspell/start",
                {
                    game_id: gameId,
                    difficulty,
                }
            );
            return res.data; // 🔥 axios.data만 반환
        } catch (error) {
            console.error("❌ 게임 재시작 API 오류:", error);
            throw error;
        }
    },
};
