import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

const GameBoard = () => {
    const { history, loading } = useSelector((state) => state.chain);
    const boardRef = useRef(null);
    const prevHistoryLength = useRef(history.length);

    // 🔥 새 단어 추가 시 맨 위로 스크롤
    useEffect(() => {
        if (boardRef.current && history.length > prevHistoryLength.current) {
            setTimeout(() => {
                boardRef.current?.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }
        prevHistoryLength.current = history.length;
    }, [history.length]);

    return (
        <div
            ref={boardRef}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto shadow-inner"
        >
            {history.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">💬</div>
                    <p className="text-gray-500 text-lg">
                        단어를 입력하여 시작하세요
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* 🔥 로딩 중 표시를 맨 위에 */}
                    {loading && (
                        <div className="bg-gradient-to-r from-yellow-300 to-yellow-200 p-4 rounded-xl text-left mr-8 shadow-md animate-pulse">
                            <div className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <span className="animate-spin">🤖</span>
                                컴퓨터가 생각 중
                                <span className="inline-flex gap-1 ml-2">
                                    <span className="animate-bounce">.</span>
                                    <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                                    <span className="animate-bounce" style={{animationDelay: '0.4s'}}>.</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 🔥 역순으로 표시 (최신이 맨 위) */}
                    {[...history].reverse().map((item, index) => (
                        <div
                            key={`${history.length - index - 1}-${item.word}`}
                            className={`p-4 rounded-xl shadow-md transform transition-all duration-300 ${
                                item.type === 'user'
                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-right ml-8'
                                    : 'bg-gradient-to-r from-white to-green-50 text-left mr-8'
                            }`}
                            style={{
                                animation: 'slideIn 0.3s ease-out'
                            }}
                        >
                            <div className="font-bold text-xl mb-1 text-gray-600">
                                {item.type === 'user' ? '👤 나' : '🤖 컴퓨터'}:
                                <span className="ml-2">{item.word}</span>
                            </div>
                            {item.definition && (
                                <div className="text-sm text-gray-900/90 mt-2 bg-black/10 px-3 py-1 rounded-lg inline-block">
                                    💡 {item.definition}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameBoard;