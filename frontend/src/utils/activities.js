// src/api/activities.js
import axiosInstance from "./axiosInstance.js";
// 독서록 전체 조회
export const getReadingLogs = async () => {
    const res = await axiosInstance.get(`/activities/list/reading_logs`);
    return res.data;
};

// 독서록 작성
export const createReadingLog = async (data) => {
    const res = await axiosInstance.post(`/activities/list/reading_logs`, data);
    return res.data;
};

// 독서록 수정
export const updateReadingLog = async (id, data) => {
    const res = await axiosInstance.patch(`/activities/list/reading_logs/${id}`, data);
    return res.data;
};

// 독서록 삭제
export const deleteReadingLog = async (id) => {
    const res = await axiosInstance.delete(`/activities/list/reading_logs/${id}`);
    return res.data;
};

// 일기 전체 조회
export const getDailyWritings = async () => {
    const res = await axiosInstance.get(`/activities/list/daily_writing`);
    return res.data;
};

// 일기 작성
export const createDailyWriting = async (data) => {
    const res = await axiosInstance.post(`/activities/list/daily_writing`, data);
    return res.data;
};

// 일기 수정
export const updateDailyWriting = async (id, data) => {
    const res = await axiosInstance.patch(`/activities/list/daily_writing/${id}`, data);
    return res.data;
};

// 일기 삭제
export const deleteDailyWriting = async (id) => {
    const res = await axiosInstance.delete(`/activities/list/daily_writing/${id}`);
    return res.data;
};

// 어휘 검색
export const getWordSearchResult = async (query) => {
    const res = await axiosInstance.get(`/activities/wordsearch?query=${encodeURIComponent(query)}`);
    return res.data;
};
