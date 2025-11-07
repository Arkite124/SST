import React, { useEffect, useState } from "react";

export default function Toast({ message, type = "success", duration = 3000 }) {
    const [visible, setVisible] = useState(true);
    const colors = {
        success: "bg-[#83BD75] text-white",
        error: "bg-red-500 text-white",
        info: "bg-[#B4E197] text-[#263035]",
    };

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), duration);
        return () => clearTimeout(timer);
    }, [duration]);

    if (!visible) return null;

    return (
        <div className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg ${colors[type]}`}>
            {message}
        </div>
    );
}
