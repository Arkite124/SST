// src/components/puzzle/PuzzleBlock.jsx
import React from 'react';

const PuzzleBlock = ({ block, onClick, type = 'source' }) => {
    const handleDragStart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            ...block,
            sourceType: type  // 🔥 이 부분만 추가
        }));
    };

    const baseStyles = "px-6 py-3 rounded-lg text-lg font-medium shadow-md transition-all duration-300 select-none";

    const typeStyles = {
        source: "bg-white hover:shadow-lg hover:-translate-y-1 active:opacity-70 active:scale-95 cursor-move",
        answer: "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
    };

    return (
        <div
            className={`${baseStyles} ${typeStyles[type]}`}
            onClick={onClick}
            draggable={true}
            onDragStart={handleDragStart}
        >
            {block.word}
        </div>
    );
};

export default PuzzleBlock;