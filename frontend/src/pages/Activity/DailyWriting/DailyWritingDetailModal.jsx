import Button from "@/components/common/Button";

export default function DailyWritingDetailModal({ writing, onEdit, onDelete, onClose }) {
    if (!writing) return null;

    // 감정 숫자를 이모티콘으로 변환
    const moodEmoji = {
        5: "😊",
        4: "😄",
        3: "😐",
        2: "😢",
        1: "😡",
    }[writing.mood] || "🙂";
    // ✅ 날짜 포맷 함수 (프론트에서 변환)
    const formatDate = (isoString) => {
        if (!isoString) return "";
        // 끝에 Z가 없으면 보정 (FastAPI가 보통 이렇게 내려줌)
        const date = new Date(isoString);

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");

        const period = hours >= 12 ? "오후" : "오전";
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;

        return `${year}년 ${month}월 ${day}일 ${period} ${hours}시 ${minutes}분`;
    };
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#4E944F] text-center">오늘의 기록</h2>

            <div className="border border-[#E9EFC0] rounded-2xl p-5 space-y-4">
                {/* 제목 */}
                <h3 className="text-xl font-semibold text-gray-800">{writing.title}</h3>

                {/* 날짜 */}
                <p className="text-sm text-gray-500">{formatDate(writing.created_at)}</p>

                {/* 내용 */}
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {writing.content}
                </p>

                {/* 감정 */}
                <div className="text-right text-3xl">{moodEmoji}</div>

                {/* 참고 링크 */}
                {writing.attachment_url && (
                    <p className="text-sm text-blue-600 underline text-right">
                        <a
                            href={writing.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            참고 링크 바로가기
                        </a>
                    </p>
                )}
            </div>

            {/* ✅ 교정된 텍스트 (cleaned_content) */}
            {writing.cleaned_content && (
                <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-1">교정된 내용</p>
                    <p className="text-blue-800 whitespace-pre-wrap">{writing.cleaned_content}</p>
                </div>
            )}

            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onEdit} label={"수정"} />
                <Button variant="danger" onClick={onDelete} label={"삭제"} />
                <Button onClick={onClose} label={"닫기"} />
            </div>
        </div>

    );
}
