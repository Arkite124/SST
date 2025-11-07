import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading.jsx";

export default function ReadingLogDetailModal({ log, onEdit, onDelete, onClose }) {
    // ✅ 날짜 포맷 함수 (YYYY년 M월 D일 오전/오후 HH시 MM분)
    const formatDate = (isoString) => {
        if (!isoString) return "";
        const safeIso = isoString.endsWith("Z") ? isoString : `${isoString}Z`;
        const date = new Date(safeIso);

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

    // ✅ log가 아직 로딩되지 않은 상태
    if (!log) {
        return <Loading/>;
    }

    // ✅ log가 존재할 때 렌더링
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#4E944F] text-center">
                📖 독서록 상세 보기
            </h2>

            {/* ✅ 이미지 + 책 정보 */}
            <div className="flex flex-col items-center border border-[#E9EFC0] rounded-2xl p-5 bg-[#F8FFF8]">
                {log.image && (
                    <img
                        src={log.image}
                        alt={log.book_title}
                        className="w-auto h-48 object-contain rounded-lg shadow-md mb-4"
                    />
                )}

                <h3 className="text-xl font-semibold text-gray-800 text-center">
                    {log.book_title}
                </h3>
                <p className="text-sm text-gray-600 text-center">
                    {log.author && `${log.author}`}
                    {log.author && log.publisher && " · "}
                    {log.publisher && `${log.publisher}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {formatDate(log.created_at)}
                </p>
            </div>

            {/* ✅ 느낀 점 */}
            <div className="border border-[#E9EFC0] rounded-2xl p-3 bg-white">
                <h4 className="text-lg font-semibold text-[#4E944F] mb-2"> 느낀 점</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {log.content || "내용이 없습니다."}
                </p>
            </div>

            {/* ✅ 교정된 텍스트 */}
            {log.cleaned_content && (
                <div className="border border-blue-200 bg-blue-50 rounded-2xl p-3">
                    <h4 className="text-lg font-semibold text-blue-700 mb-2">
                        교정된 텍스트
                    </h4>
                    <p className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {log.cleaned_content}
                    </p>
                </div>
            )}

            {/* ✅ 어려웠던 문장 */}
            {log.unknown_sentence && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-2xl p-2">
                    <h4 className="text-lg font-semibold text-yellow-700 mb-2">
                        어려웠던 문장
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {log.unknown_sentence}
                    </p>
                </div>
            )}

            {/* ✅ 버튼 영역 */}
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onEdit} label={"수정"} />
                <Button variant="danger" onClick={onDelete} label={"삭제"} />
                <Button onClick={onClose} label={"닫기"} />
            </div>
        </div>
    );
}
