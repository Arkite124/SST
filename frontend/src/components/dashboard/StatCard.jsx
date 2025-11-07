// src/components/child/dashboard/StatCard.jsx
import React from "react";

export default function StatCard({ title, value, description, icon }) {
    return (
        <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center hover:shadow-lg transition">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-bold text-green-800">{title}</h3>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
    );
}