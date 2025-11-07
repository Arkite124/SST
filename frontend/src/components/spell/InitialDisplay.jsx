// 📁 src/components/spell/InitialDisplay.jsx
import React, { useEffect } from 'react';

const InitialDisplay = ({ initial }) => {
    // 🔥 initial이 변경될 때마다 로깅
    useEffect(() => {
        console.log('🎯 InitialDisplay 업데이트:', {
            initial,
            length: initial?.length,
            charCodes: initial?.split('').map(c => c.charCodeAt(0))
        });
    }, [initial]);
    return (
        <div className="bg-purple-100 p-8 rounded-2xl">
            <div className="text-sm text-purple-600 mb-2">초성</div>
            <div className="text-6xl font-bold text-purple-700 text-center tracking-wider">
                {initial || '❓'}
            </div>
            {/* 🔥 디버깅용 실제 값 표시 */}
            <div className="text-xs text-gray-500 mt-2 text-center">
                실제값: "{initial}" (길이: {initial?.length})
            </div>
        </div>
    );
};

export default InitialDisplay;