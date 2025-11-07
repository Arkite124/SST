// src/components/common/Notification.jsx
import React, { useEffect, useState } from 'react';

/**
 * 통합 알림 컴포넌트
 *
 * @param {Object} props
 * @param {string} props.message - 표시할 메시지
 * @param {string} props.type - 'success' | 'error' | 'info' | 'warning'
 * @param {Function} props.onClose - 닫기 콜백
 * @param {number} props.duration - 자동 닫힘 시간 (ms), 0이면 자동 닫힘 안 함
 * @param {string} props.position - 'top' | 'center' | 'bottom'
 * @param {string} props.variant - 'toast' | 'banner' | 'modal'
 */
const Notification = ({
                          message,
                          type = 'info',
                          onClose,
                          duration = 3000,
                          position = 'top',
                          variant = 'toast',
                      }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);

            if (duration > 0) {
                const timer = setTimeout(() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300); // 페이드아웃 후 제거
                }, duration);

                return () => clearTimeout(timer);
            }
        }
    }, [message, duration, onClose]);

    if (!message) return null;

    // 타입별 스타일
    const typeStyles = {
        success: {
            bg: 'bg-green-500',
            icon: '✅',
            border: 'border-green-600',
        },
        error: {
            bg: 'bg-red-500',
            icon: '❌',
            border: 'border-red-600',
        },
        warning: {
            bg: 'bg-yellow-500',
            icon: '⚠️',
            border: 'border-yellow-600',
        },
        info: {
            bg: 'bg-blue-500',
            icon: 'ℹ️',
            border: 'border-blue-600',
        },
    };

    const style = typeStyles[type] || typeStyles.info;

    // 위치별 스타일
    const positionStyles = {
        top: 'top-4',
        center: 'top-1/2 -translate-y-1/2',
        bottom: 'bottom-4',
    };

    // 변형별 스타일
    const variantStyles = {
        // 토스트 (작은 알림)
        toast: `fixed ${positionStyles[position]} left-1/2 -translate-x-1/2 z-50 max-w-md`,
        // 배너 (상단 고정)
        banner: 'fixed top-0 left-0 right-0 z-50',
        // 모달 (전체 화면 오버레이)
        modal: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60',
    };

    if (variant === 'banner') {
        return (
            <div
                className={`${style.bg} text-white py-4 px-6 shadow-lg transition-all duration-300 ${
                    isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{style.icon}</span>
                        <span className="font-semibold">{message}</span>
                    </div>
                    {onClose && (
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                setTimeout(onClose, 300);
                            }}
                            className="text-white hover:text-gray-200 text-xl font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'modal') {
        return (
            <div
                className={`${variantStyles[variant]} transition-opacity duration-300 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <div
                    className={`${style.bg} text-white px-8 py-6 rounded-2xl shadow-2xl transform transition-all duration-300 ${
                        isVisible ? 'scale-100' : 'scale-95'
                    }`}
                >
                    <div className="text-center">
                        <div className="text-5xl mb-3">{style.icon}</div>
                        <div className="text-2xl font-bold whitespace-pre-line">
                            {message}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Toast (기본)
    return (
        <div
            className={`${variantStyles[variant]} transition-all duration-300 ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
        >
            <div
                className={`${style.bg} text-white px-6 py-4 rounded-xl shadow-lg border-2 ${style.border} flex items-center gap-3`}
            >
                <span className="text-2xl">{style.icon}</span>
                <span className="font-semibold flex-1">{message}</span>
                {onClose && (
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            setTimeout(onClose, 300);
                        }}
                        className="text-white hover:text-gray-200 text-xl font-bold ml-2"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

export default Notification;