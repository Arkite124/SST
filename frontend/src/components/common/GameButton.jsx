import React from 'react';

const GameButton = ({ children, onClick, variant , disabled = false, className = '' }) => {
    const baseClass = 'px-6 py-3 rounded-lg font-bold transition-all duration-200';

    const variants = {
        primary: 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300',
        secondary: 'bg-gray-500 text-white hover:bg-gray-600',
        success: 'bg-green-500 text-white hover:bg-green-600',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClass} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

export default GameButton;