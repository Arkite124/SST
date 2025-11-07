// src/components/common/GameTimer.jsx
import React from 'react';

/**
 * 통합 게임 타이머 컴포넌트
 *
 * @param {Object} props
 * @param {number} props.timeLeft - 남은 시간 (초)
 * @param {string} props.variant - 'simple' | 'detailed' | 'circular'
 * @param {number} props.warningThreshold - 경고 표시 임계값 (초)
 * @param {number} props.criticalThreshold - 위험 표시 임계값 (초)
 * @param {boolean} props.showIcon - 아이콘 표시 여부
 */
const GameTimer = ({
                       timeLeft,
                       variant = 'simple',
                       warningThreshold = 10,
                       criticalThreshold = 5,
                       showIcon = true,
                   }) => {
    const isWarning = timeLeft <= warningThreshold && timeLeft > criticalThreshold;
    const isCritical = timeLeft <= criticalThreshold;

    // 색상 결정
    const getColorClasses = () => {
        if (isCritical) {
            return {
                text: 'text-red-600',
                bg: 'bg-red-500',
                border: 'border-red-500',
                gradient: 'from-red-500 to-red-600',
            };
        }
        if (isWarning) {
            return {
                text: 'text-orange-600',
                bg: 'bg-orange-500',
                border: 'border-orange-500',
                gradient: 'from-orange-500 to-orange-600',
            };
        }
        return {
            text: 'text-green-600',
            bg: 'bg-green-500',
            border: 'border-green-500',
            gradient: 'from-green-500 to-green-600',
        };
    };

    const colors = getColorClasses();

    // Simple 버전 (끝말잇기용)
    if (variant === 'simple') {
        return (
            <div className="text-center mb-4">
                <span
                    className={`text-2xl font-bold ${colors.text} ${
                        isCritical ? 'animate-pulse' : ''
                    }`}
                >
                    {showIcon && '⏰ '}남은 시간: {timeLeft}초
                </span>
                {timeLeft === 0 && (
                    <div className="text-red-500 text-sm mt-2 animate-pulse">
                        ⚠️ 시간 초과!
                    </div>
                )}
            </div>
        );
    }

    // Detailed 버전 (초성퀴즈용)
    if (variant === 'detailed') {
        return (
            <div
                className={`border-4 ${colors.border} rounded-xl p-4 text-center min-w-[120px] transition-all ${
                    isCritical ? 'animate-pulse' : ''
                }`}
            >
                <div className="text-sm font-semibold opacity-70">남은 시간</div>
                <div className={`text-4xl font-bold ${colors.text}`}>
                    {timeLeft}초
                </div>
                {isCritical && (
                    <div className="text-xs mt-1 font-semibold text-red-600">
                        ⚠️ 서두르세요!
                    </div>
                )}
            </div>
        );
    }

    // Circular 버전 (원형 프로그레스)
    if (variant === 'circular') {
        const initialTime = 30; // 초기 시간 (props로 받을 수도 있음)
        const percentage = (timeLeft / initialTime) * 100;
        const circumference = 2 * Math.PI * 45; // 반지름 45
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                    {/* 배경 원 */}
                    <circle
                        cx="64"
                        cy="64"
                        r="45"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                    />
                    {/* 진행 원 */}
                    <circle
                        cx="64"
                        cy="64"
                        r="45"
                        stroke={isCritical ? '#ef4444' : isWarning ? '#f97316' : '#10b981'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />
                </svg>
                {/* 중앙 텍스트 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${colors.text}`}>
                        {timeLeft}
                    </span>
                    <span className="text-xs text-gray-500">초</span>
                </div>
            </div>
        );
    }

    return null;
};

export default GameTimer;