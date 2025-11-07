// 📁 src/components/wordspell/AnswerInput.jsx
import React, { useRef, useEffect } from 'react';
import GameButton from '../common/GameButton';

const AnswerInput = ({ value, onChange, onSubmit, loading, disabled }) => {
    const inputRef = useRef(null);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !disabled) {
            onSubmit();
        }
    };

    // 🔥 항상 input에 포커스 유지
    useEffect(() => {
        if (inputRef.current && !loading) {
            inputRef.current.focus();
        }
    }, [loading, value]); // value가 변경될 때마다 다시 포커스

    return (
        <div className="w-full space-y-3">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-2 border-purple-300 p-4 rounded-lg w-full text-center text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="정답을 입력하세요"
                disabled={loading}
            />
            <GameButton
                onClick={onSubmit}
                disabled={disabled || loading}
                className="w-full py-3 text-lg"
            >
                {loading ? '제출 중...' : '제출하기'}
            </GameButton>
        </div>
    );
};

export default AnswerInput;