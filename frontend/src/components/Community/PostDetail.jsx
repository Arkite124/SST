// PostDetail.jsx
export default function PostDetail({ post }) {
    return (
        <div className="p-4 rounded bg-white pt-0">
            <div className="px-5 py-2 rounded-t-xl">
                {post.discussion_tags && (
                    <div
                        className="text-[#53914d] bg-[#f1ffe0] border-[2pt] border-[#53914d] inline-block font-bold px-3 py-0.5 rounded-full text-[12pt]"
                    >
                        # {post.discussion_tags}
                    </div>
                )}
                {/* 제목 */}
                <h2 className="text-3xl font-bold mt-3">{post.title}</h2>

                {/* 책 제목 */}
                {post.book_title && (
                    <div className="text-[15pt] font-bold mt-2 text-gray-400">
                        {post.book_title}
                    </div>
                )}

                {/* 메타 정보 */}
                <div className="flex items-center space-x-1 text-sm text-gray-500 mt-[10pt] mb-[10pt]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 14 16">
                        <path
                            d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                    </svg>
                    {post.user?.nickname || "알 수 없음"}
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="16" fill="currentColor"
                         className="bi bi-calendar-check ml-[50pt] mr-[5pt]" viewBox="0 0 5 16">
                        <path
                            d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                        <path
                            d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                    </svg>
                    {new Date(post.created_at).toLocaleDateString()}
                </div>

            </div>



            <hr/>
            {/* 내용 */}
            <p className="text-gray-800 whitespace-pre-wrap m-[20pt]   ">{post.content}</p>
        </div>
    );
}