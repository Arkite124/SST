// src/components/puzzle/AnswerArea.jsx
import React, { useState } from 'react';

const AnswerArea = ({ blocks, onRemove, onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const draggedBlock = JSON.parse(data);

            if (draggedBlock.sourceType === 'answer') {
                return;
            }

            if (draggedBlock.sourceType === 'source') {
                onDrop(draggedBlock);
            }
        } catch (error) {
            console.error('드래그 데이터 파싱 오류:', error);
        }
    };

    return (
        <div
            className={`
                bg-gradient-to-br from-green-50 to-green-100 
                p-6 rounded-xl mb-6
                border-3 border-dashed transition-all duration-300
                ${isDragOver
                ? 'border-green-600 bg-green-200 scale-[1.02]'
                : 'border-green-400'
            }
            `}
            style={{ minHeight: 'auto' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {blocks.length === 0 ? (
                <div className="text-gray-400 text-center flex items-center justify-center" style={{ minHeight: 'auto' }}>
                    <div>
                        <div className="text-4xl mb-2">📝</div>
                        <p className="text-lg">여기에 단어를 드래그하여 문장을 완성하세요</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2 leading-normal">
                    {blocks.map((block, index) => (
                        <span
                            key={`answer-${block.id}-${index}`}
                            onClick={() => onRemove(index)}
                            className="inline-block px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium shadow-md hover:bg-green-600 cursor-pointer transition-all hover:-translate-y-0.5 text-lg"
                        >
                            {block.word}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AnswerArea;