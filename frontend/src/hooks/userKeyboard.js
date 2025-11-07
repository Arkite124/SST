// hooks/useKeyboard.js
import { useEffect } from 'react';

export const useKeyboard = (key, callback) => {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === key) {
                callback(e);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [key, callback]);
};

// 사용 예시
// useKeyboard('Enter', handleSubmit);