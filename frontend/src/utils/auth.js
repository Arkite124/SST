// src/api/auth.js
import axiosInstance from "@/utils/axiosInstance.js";

// 회원가입
export const register = async (userData) => {
    const response = await axiosInstance.post("/auth/register", userData);
    return response.data;
};

// 로그인
export const login = async (loginData) => {
    const response = await axiosInstance.post("/auth/login", loginData);
    return response.data;
};

// 프로필 가져오기
export const getAuthUser = async () => {
    const response = await axiosInstance.get("/auth/me");
    return response.data;
};

// 로그아웃
export const logoutUser = async () => {
    const response = await axiosInstance.post("/auth/logout",{});
    return response.data;
};
