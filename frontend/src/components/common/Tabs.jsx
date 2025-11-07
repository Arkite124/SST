import React from "react";

export default function Tabs({ tabs, active, onChange }) {
    return (
        <div className="flex gap-4 border-b border-gray-200 mb-4">
            {tabs.map(tab => (
                <button
                    key={tab}
                    className={`pb-2 font-semibold transition-colors ${
                        active === tab
                            ? "text-[#4E944F] border-b-2 border-[#4E944F]"
                            : "text-gray-500 hover:text-[#83BD75]"
                    }`}
                    onClick={() => onChange(tab)}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}
