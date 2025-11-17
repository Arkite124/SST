// utils/format.js

// 1) 숫자 세 자리 콤마 (10000 → "10,000")
export function numberWithComma(num) {
    return num.toLocaleString();
}

// 2) 가격 표시 "₩10,000"
export function formatPrice(num) {
    return `₩${numberWithComma(num)}`;
}

// 3) 문자열 최대 길이 제한 (UI에서 유용함)
export function truncateText(text, max = 20) {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
}

// 4) 퍼센트 계산 (소수점 1자리)
export function toPercent(value, total) {
    if (!total || total === 0) return "0%";
    return ((value / total) * 100).toFixed(1) + "%";
}

// 5) 테스트 점수 포맷 (0.923 → "92.3점")
export const formatScore = (score) => {
    if (score == null) return "0점";
    return `${score}점`;
};

export const formatSimilarity = (similarity) => {
    if (similarity == null) return "0%";
    return `${Math.round(similarity * 100)}%`;
};