// src/api/vocabularyApi.js
import axiosInstance from "@/utils/axiosInstance.js";

export const vocabularyApi = {
  //  게임 시작: 10개 문제를 한 번에 받아옴
  startGame: async ({ user_id, age_level, num_questions = 10 }) => {
    const response = await axiosInstance.post(`/test/vocabulary/start`, {
      user_id,
      age_level,
      num_questions,
    });
    return response.data;
  },

  //  답안 제출
  submitAnswer: async ({ user_id, question_data, user_choice_index }) => {
    const payload = {
      user_id: user_id,
      question_data: question_data,
      user_choice_index: user_choice_index,
    };

    const response = await axiosInstance.post(`/test/vocabulary/verify`, payload);
    return response.data;
  },

  //  게임 종료 - 백엔드 vocabulary.py의 EndGameRequest에 맞춤
  endGame: async ({ user_id, questionHistory }) => {
    if (!questionHistory || questionHistory.length === 0) {
      throw new Error("questionHistory가 비어있습니다.");
    }

    //  백엔드가 기대하는 question_history 형식으로 변환
    const payload = {
      user_id: Number(user_id),
      test_type: "vocabulary",
      question_history: questionHistory.map(q => ({
        question_id: q.questionNumber || q.question_id,
        question: q.question,
        blank_sentence: q.blank_sentence || q.question, // blank_sentence 필드 추가
        choices: Array.isArray(q.choices) ? q.choices : [],
        userAnswer: q.userAnswer || "",
        isCorrect: q.isCorrect ?? false,
        age_level: Number(q.ageLevel || q.age_level || 4)
      }))
    };
    const response = await axiosInstance.post(`/test/vocabulary/end`, payload);

    return {
      total_score: response.data.total_score || 0,
      message: response.data.message,
      total: questionHistory.length
    };
  },
};
