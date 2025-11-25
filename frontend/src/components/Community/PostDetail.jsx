// PostDetail.jsx
export default function PostDetail({ post }) {
    return (
        <div className="border p-4 rounded bg-white shadow-sm">
            {/* 제목 */}
            <h2 className="text-2xl font-bold">{post.title}</h2>

            {/* 메타 정보 */}
            <div className="text-sm text-gray-500 mt-1">
                작성자: {post.user?.nickname || "알 수 없음"} |
                작성일: {new Date(post.created_at).toLocaleDateString()}
            </div>

            {/* 책 제목 / 태그 */}
            {post.book_title && (
                <div className="mt-2 text-gray-700">
                    책 제목: {post.book_title}
                </div>
            )}
            {post.discussion_tags && (
                <div className="mt-1 text-gray-500 text-sm">
                    태그: {post.discussion_tags}
                </div>
            )}

            {/* 내용 */}
            <p className="mt-3 text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
    );
}