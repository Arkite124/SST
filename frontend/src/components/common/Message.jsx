import React from 'react';

const Message = ({ message, type = 'info', onClose }) => {
    if (!message) return null;

    const typeStyles = {
        success: 'bg-green-100 text-green-800 border-green-300',
        error: 'bg-red-100 text-red-800 border-red-300',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        info: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${typeStyles[type]} mb-4 relative`}>
            {message}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-xl font-bold"
                >
                    ×
                </button>
            )}
        </div>
    );
};

export default Message;