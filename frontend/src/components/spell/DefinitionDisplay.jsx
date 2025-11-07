// 📁 src/components/wordspell/DefinitionDisplay.jsx
import React from 'react';

const DefinitionDisplay = ({ definition }) => {
    return (
        <div className="bg-gray-100 p-4 rounded-lg w-full">
            <div className="text-sm text-gray-500 mb-1">뜻</div>
            <div className="text-lg text-gray-800">
                {definition || '설명 없음'}
            </div>
        </div>
    );
};

export default DefinitionDisplay;