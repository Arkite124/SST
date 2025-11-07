import React from "react";

export default function Input({
                                  type = "text",
                                  placeholder,
                                  value,
                                  onChange,
                                  className = "",
                              }) {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#B4E197] outline-none ${className}`}
        />
    );
}
