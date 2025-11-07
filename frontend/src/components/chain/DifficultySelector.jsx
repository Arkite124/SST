import React from 'react';
import Button from '../common/Button';
import GameButton from "@/components/common/GameButton.jsx";

const DifficultySelector = ({ onSelect }) => {
    return (
        <div className="text-center p-8">
            <h2 className="text-3xl font-bold mb-8">난이도를 선택하세요</h2>
            <div className="flex gap-4 justify-center flex-wrap">
                <GameButton variant="success" onClick={() => onSelect('easy')}>
                    쉬움
                </GameButton>
                <GameButton variant="warning" onClick={() => onSelect('medium')}>
                    보통
                </GameButton>
                <GameButton variant="danger" onClick={() => onSelect('hard')}>
                    어려움
                </GameButton>
            </div>
        </div>
    );
};

export default DifficultySelector;