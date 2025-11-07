import React from "react";

export default function Button({ label, onClick, variant = "primary", disabled = false }) {
    const base = "px-4 py-2.5 rounded-xl font-semibold transition-colors duration-200";
    const styles = {
        primary: "bg-[#4E944F] text-white hover:bg-[#83BD75]",
        secondary: "bg-[#E9EFC0] text-[#263035] hover:bg-[#B4E197]",
        danger: "bg-red-500 text-white hover:bg-red-600",
        ghost: "border border-gray-300 hover:bg-gray-100",
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${styles[variant]} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
            {label}
        </button>
    );
}
