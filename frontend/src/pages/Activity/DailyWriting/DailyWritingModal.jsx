import { useState } from "react";
import Button from "@/components/common/Button";

export default function DailyWritingModal({ onSubmit, onClose }) {
    const [content, setContent] = useState("");
    const [mood, setMood] = useState(5);
    const [title,setTitle]=useState("")
    const [attachment_url,setAttachment_url]=useState("")
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return alert("내용을 입력해주세요!");
        const created_at = new Date().toISOString().split("T")[0];
        onSubmit({ content,mood:mood,title, created_at,attachment_url });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#4E944F] text-center">
                ✏️ 오늘의 일기
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 제목 */}
                <div>
                    <label>
                        오늘의 일기 제목
                        <input
                            type="text"
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem] focus:ring-2 focus:ring-[#4E944F]"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="오늘의 일기 제목은 뭔가요?"
                            required
                        />
                    </label>
                </div>
                {/* 내용 */}
                <div>
                    <label>
                        오늘 하루는 어땠나요?
                        <textarea
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-40 focus:ring-2 focus:ring-[#4E944F]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="오늘 하루는 어땠나요?"
                            required
                        />
                    </label>

                </div>

                {/* 감정 선택 */}
                <div className="flex justify-between items-center">
                    <label
                        className="text-gray-600 select-none"
                    >
                        오늘의 감정
                        <select
                            value={mood}
                            onChange={(e) => setMood(Number(e.target.value))}
                            className="border border-[#B4E197] rounded-lg p-1 focus:ring-2 focus:ring-[#4E944F]"
                            required
                        >
                            <option value={5}>😊</option>
                            <option value={4}>😄</option>
                            <option value={3}>😐</option>
                            <option value={2}>😢</option>
                            <option value={1}>😡</option>
                        </select>
                    </label>
                </div>

                {/* 첨부 URL */}
                <div>
                    <label>
                        참고 링크
                        <input
                            className="w-full border border-[#B4E197] rounded-xl p-2 h-[3rem] focus:ring-2 focus:ring-[#4E944F]"
                            value={attachment_url}
                            onChange={(e) => setAttachment_url(e.target.value)}
                            placeholder="같이 본 인터넷 주소가 있으면 넣어주세요!"
                        />
                    </label>
                </div>

                {/* 버튼 */}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} label="취소"/>
                    <Button type="submit" label="등록"/>
                </div>
            </form>
        </div>
    );
}
