export const calculateFinalLevel = (levelHistory) => {
    if (levelHistory.length === 0) {
        return { age: 4 };
    }

    // 평균 나이 계산
    const avgAge = Math.round(
        levelHistory.reduce((sum, h) => sum + h.age, 0) / levelHistory.length
    );

    return { age: avgAge };

};

export const getLevelDescription = (age) => {
    return `${age}세 수준`;
};