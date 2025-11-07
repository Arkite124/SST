import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
    // 🔥 중요: withCredentials를 false로 (CORS 이슈 방지)
    withCredentials: true,
});

// 🔥 요청 인터셉터 - 새로고침 방지
api.interceptors.request.use(
    (config) => {
        // 요청 시 로딩 상태 등 관리 가능
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🔥 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
    (response) => {
        // 🔥 data만 반환 (response.data.data 이슈 방지)
        return response.data;
    },
    (error) => {
        console.error('API 에러:', error);
        return Promise.reject(error);
    }
);

export default api;