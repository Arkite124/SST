// utils/date.js

// 1) 2025-01-15 → Jan 15, 2025
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

// 2) 2025-01-15T09:30 → 09:30
export function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// 3) 상대 시간 (“3시간 전”, “2일 전”)
export function timeAgo(dateStr) {
    const now = new Date();
    const past = new Date(dateStr);

    const diff = (now - past) / 1000; // 초 단위

    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return formatDate(dateStr);
}

// 4) YYYY-MM-DD 형태로 반환 (DB 저장용)
export function formatDBDate(date) {
    return new Date(date).toISOString().split("T")[0];
}
