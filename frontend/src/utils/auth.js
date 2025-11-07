// src/api/auth.js
import axios from "axios";

// const serverURL = "aws_url/";
export const API = axios.create({
    baseURL: "http://localhost:8000", // FastAPI 서버 주소
    withCredentials: true,            // ✅ 쿠키(JWT) 포함
});
// refresh 요청 중인지 상태 저장 (전역 변수)
let isRefreshing = false;
// 응답 인터셉터
API.interceptors.response.use(
    (response) => response,
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
                    await API.post("/auth/refresh", {});
                    isRefreshing = false;

                    originalRequest._retry = true; // ✅ 재시도는 1번만
                    return API(originalRequest);
                } catch (refreshError) {
                    isRefreshing = false;
                    console.error("❌ Refresh token expired, please login again");
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);

// 회원가입
export const register = async (userData) => {
    const response = await API.post("/auth/register", userData);
    return response.data;
};

// 로그인
export const login = async (loginData) => {
    const response = await API.post("/auth/login", loginData);
    return response.data;
};

// 프로필 가져오기
export const getAuthUser = async () => {
    const response = await API.get("/auth/me");
    return response.data;
};

// 로그아웃
export const logoutUser = async () => {
    const response = await API.post("/auth/logout",{});
    return response.data;
};
