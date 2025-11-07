import React from "react";

/**
 * Card 컴포넌트
 *
 * variant:
 *  - "default": 일반 카드 (흰 배경, 그림자)
 *  - "highlight": 강조 카드 (연녹색 배경, 강한 그림자)
 *  - "flat": 테두리만 있는 깔끔한 카드
 */
export default function Card({
                                 children,
                                 variant = "default",
                                 className = "",
                                 onClick,
                             }) {
    const variants = {
        default:
            "bg-white shadow-md rounded-2xl p-6 transition-transform duration-300 hover:shadow-lg hover:-translate-y-1",
        highlight:
            "bg-[#E9EFC0] shadow-lg rounded-2xl p-6 transition-transform duration-300 hover:shadow-xl hover:-translate-y-1",
        flat:
            "bg-white border border-gray-200 rounded-xl p-4 transition duration-300 hover:border-[#83BD75] hover:shadow-md",
    };

    return (
        <div
            className={`${variants[variant]} ${className} cursor-default`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
