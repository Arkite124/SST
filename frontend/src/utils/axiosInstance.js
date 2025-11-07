import axios from "axios";

// ✅ 공통 axios 인스턴스
const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // 쿠키 포함 필수!
});

// refresh 요청 중인지 상태 저장 (전역 변수)
let isRefreshing = false;

// ✅ 401 → refresh 자동 갱신 인터셉터
instance.interceptors.response.use(
    (res) => res,
    async (error) => {
            const originalRequest = error.config;
            // ❌ 이미 refresh 시도했는데도 또 401 뜨면 무한루프 방지
            if (originalRequest._retry) {
                return Promise.reject(error);
            }
            if (error.response?.status === 401) {
                if (!isRefreshing) {
                    isRefreshing = true;
                    try {
                        await instance.post("/auth/refresh", {});
                        isRefreshing = false;
    
                        originalRequest._retry = true; // ✅ 재시도는 1번만
                        return instance(originalRequest);
                    } catch (refreshError) {
                        isRefreshing = false;
                        console.error("리프레시 토큰이 없습니다.");
                        return Promise.reject(refreshError);
                    }
                }
            }
            return Promise.reject(error);
        }
);

export default instance;
