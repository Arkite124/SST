import React from "react";

export default function ProgressBar({ value = 0, max = 100 }) {
    const percent = Math.min((value / max) * 100, 100);
    return (
        <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
            <div
                className="h-2 bg-[#4E944F] rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
