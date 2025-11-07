
import axiosInstance from "@/utils/axiosInstance.js";


const API_URL = "http://localhost:8000/test/reading";

export const readingApi = {
    // 현재 로그인한 사용자 정보 조회
    async getCurrentUser() {
        const res = await axiosInstance.get("/auth/me");
        return res.data; // { id, name, email, vocabulary_age, ... }
    },

    // ===== 게임 관련 =====

    // ✅ 게임 시작: 10개 문제를 한 번에 받아옴
    startGame: async (user_id, numQuestions = 10, ageLevel = null) => {
        if (!ageLevel) {
            const user = await readingApi.getCurrentUser();
            ageLevel = user.vocabulary_age || 7;
        }

        const res = await axiosInstance.post(`${API_URL}/start`, {
                num_questions: numQuestions,
                age_level: ageLevel
            },
            { params: { user_id: user_id } } // FastAPI read.py start 엔드포인트에 맞춤
        );
        return res.data;
    },

    /**
     * 단일 문제 생성 (커스텀 문단 사용 시)
     * @param {string} paragraph - 문단 내용
     * @param {number} ageLevel - 난이도 (선택사항)
     * @param {string} mode - "qna", "comprehension", "auto" (기본값: "comprehension")
     * @returns {Promise<Object>}
     */
    async generateQuestion(userId, paragraph, ageLevel = null, mode = "comprehension") {
        if (!ageLevel) {
            const user = await this.getCurrentUser();
            ageLevel = user.vocabulary_age || 7;
        }

        const res = await axiosInstance.post("/test/reading/generate", {
            paragraph,
            age_level: ageLevel,
            mode
        }, {
            params: { user_id: userId }
        });

        return res.data;
        /* 반환 형식:
        {
            mode: "comprehension",
            qna: { question: "...", answer: "...", distractors: [...], choices: [...] },
            comprehension: {
                type: "comprehension",
                age_level: 7,
                context: "문단...",
                question: "질문?",
                choices: ["선택지1", "선택지2", "선택지3", "선택지4"],
                correct_answer: "정답",
                correct_index: 2
            },
            error: null
        }
        */
    },

    // ===== 답안 검증 =====

    submitAnswer: async (userId, questionData, userChoiceIndex) => {
        if (!questionData || typeof questionData !== "object") {
            throw new Error("questionData가 올바르지 않습니다.");
        }

        if (!userId) {
            // userId 없으면 현재 로그인 사용자 가져오기
            const user = await readingApi.getCurrentUser();
            userId = user.id;
        }

        if (!questionData || !questionData.choices) {
            questionData.choices = [];
        }

        const payload = {
            user_id: userId,
            question_data: {
                question_id: questionData.question_id,
                choices: questionData.choices,
                correct_index: questionData.correct_index != null ? Number(questionData.correct_index) : 0,
                correct_answer: questionData.correct_answer || "",
                age_level: questionData.age_level || 7,
            },
            user_choice_index: Number(userChoiceIndex)
        };

        const res = await axiosInstance.post("/test/reading/verify", payload);
        return res.data;
    },

    /**
     * 게임 종료 처리
     * @param {number} userId - 사용자 ID
     * @param questionHistory
     * @param {string} testType - 테스트 타입 (기본값: "read")
     */
    async endGame(userId, questionHistory, testType = "reading") {
        if (!questionHistory || questionHistory.length === 0) {
            throw new Error("questionHistory가 비어있습니다.");
        }

        // 백엔드 /end 호출
        const payload = {
            user_id: userId,
            test_type: testType,
            question_history: questionHistory.map(q => ({
                question_id: Number(q.question_id),
                question: q.question,
                choices: Array.isArray(q.choices) ? q.choices : [],
                userAnswer: q.user_answer || q.userAnswer || "",  // ✅ snake_case 지원
                correctAnswer: q.correct_answer || q.correctAnswer || q.choices?.[q.correct_index] || "",
                isCorrect: q.is_correct ?? q.isCorrect ?? false,  // ✅ 두 가지 형식 모두 지원
                age_level: Number(q.age_level ?? 7)
            }))
        };


        // ✅ 백엔드 /end 엔드포인트만 호출 (중복 저장 제거)
        const res = await axiosInstance.post(`${API_URL}/end`, payload);

        return {
            total: questionHistory.length,
            correct: res.data.total_score || 0,
            totalScore: res.data.total_score || 0,
            message: res.data.message
        };
    },

    /**
     * 사용자의 세션 히스토리 조회
     * @param {number} userId - 사용자 ID
     * @param {number} limit - 조회할 세션 개수 (기본값: 10)
     */
    async getSessionHistory(userId, limit = 10) {
        const res = await axiosInstance.get(`/test/session/history/${userId}`, {
            params: { limit }
        });
        return res.data;
    },

    /**
     * 특정 세션 상세 조회
     * @param {number} sessionId - 세션 ID
     */
    async getSessionDetail(sessionId) {
        const res = await axiosInstance.get(`/test/session/${sessionId}`);
        return res.data;
    },

    // ===== 평가 결과 조회 =====

    /**
     * 평가 결과 조회
     * @param {string} testType - 테스트 타입 (기본값: "reading")
     */
    async getAssessmentResult(testType = "reading") {
        const res = await axiosInstance.get("/result", {
            params: { test_type: testType }
        });
        return res.data;
    }
};