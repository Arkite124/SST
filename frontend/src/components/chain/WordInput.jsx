import React, {useState, useEffect, useRef} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {submitWord, restartGame} from '@/redux/slices/chainSlice.js';

const WordInput = () => {
    const dispatch = useDispatch();
    const { gameId, loading, gameOver } = useSelector((state) => state.chain);
    const [word, setWord] = useState('');
    const inputRef = useRef(null);

    // 🔥 항상 input에 focus 유지
    useEffect(() => {
        if (!gameOver && !loading) {
            inputRef.current?.focus();
        }
    }, [loading, gameOver, word]);

    // 🔥 핵심: 완전히 새로고침 방지
    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (gameOver || loading || !gameId) return;

        const trimmedWord = word.trim();

        // 빈 단어 방지
        if (!trimmedWord) return;

        // 특수 명령어 처리
        if (trimmedWord === '그만') {
            setWord('');
            await dispatch(submitWord({ gameId, word: '' }));
            return;
        }

        if (trimmedWord === '다시') {
            setWord('');
            await dispatch(restartGame());
            return;
        }

        // 🔥 단어 제출 (입력창은 제출 후에 비움)
        try {
            await dispatch(submitWord({ gameId, word: trimmedWord })).unwrap();
            // 성공 시에만 입력창 비우기
            setWord('');
        } catch (error) {
            // 🔥 실패 시에도 입력창 비우기 (하지만 단어는 Redux에 이미 전달됨)
            setWord('');
        }
    };

    // 🔥 Enter 키 처리
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(null);
        }
    };

    // 🔥 버튼 클릭
    const handleButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(null);
    };

    return (
        <div className="mb-4">
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={loading ? "컴퓨터가 생각 중..." : "단어를 입력하세요... (그만/다시)"}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                        loading
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300 focus:border-blue-500'
                    }`}
                    disabled={loading || gameOver}
                    autoFocus
                    autoComplete="off"
                />
                <button
                    type="button"
                    onClick={handleButtonClick}
                    disabled={loading || gameOver}
                    className={`px-6 py-3 rounded-lg font-bold min-w-[80px] transition-all ${
                        loading || gameOver
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                            <span className="animate-spin">⏳</span>
                        </span>
                    ) : (
                        '입력'
                    )}
                </button>
            </div>

            {loading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm font-medium">컴퓨터가 단어를 찾고 있어요...</span>
                </div>
            )}
        </div>
    );
};

export default WordInput;