// src/pages/ParentLoginPage.jsx
import React, { useState } from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import { useNavigate } from "react-router-dom";

export default function ParentLoginPage() {
    const [parentKey, setParentKey] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await axiosInstance.post("/parent/login", { parent_key: parentKey });
            navigate('/parent/dashboard')
        } catch {
            setError("인증 실패: 올바른 부모 키를 입력하세요.");
        }
    };
    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#F0FDF4]">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md w-[20rem]">
                <h2 className="text-xl font-bold text-green-800 mb-4">부모 로그인</h2>
                <input
                    type="password"
                    value={parentKey}
                    onChange={(e) => setParentKey(e.target.value)}
                    placeholder="부모 인증 키 입력"
                    className="border border-green-300 rounded-md p-2 w-full mb-3 focus:ring-2 focus:ring-green-400"
                />
                <button
                    type="submit"
                    className="bg-[#4E944F] hover:bg-[#3a7a3d] text-white w-full py-2 rounded-md font-semibold"
                >
                    로그인
                </button>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </form>
        </div>
    );
}