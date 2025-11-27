import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
axios.defaults.baseURL = "http://localhost:8000";
axios.defaults.withCredentials = true;

// 1. 댓글 목록 조회 (상위 댓글만, 1depth)
export const loadComments = createAsyncThunk(
    "comment/loadComments",
    async ({ postId, page = 1, size = 10 }) => {
        const res = await axios.get(`/communities/student/posts/${postId}/comments`, {
            params: { page, size },
        });
        return res.data.items.map(c => ({
            id: c.id,
            content: c.content,
            replies: [],
            showReplies: false,
            postId: c.post_id,
            user: c.user,
            hasReplies: c.has_replies,
            created_at: c.created_at,   // 추가
            updated_at: c.updated_at,   // 추가
            replyId: c.reply_id,
        }));
    }
);

// 2. 댓글 작성 (상위 댓글)
export const addComment = createAsyncThunk(
    "comment/addComment",
    async ({ postId, content, replyId = null }) => {
        const body = {
            post_id: postId,
            content,
        };

        // ✅ reply_id가 null이면 아예 필드를 포함하지 않음
        if (replyId !== null && replyId !== undefined) {
            body.reply_id = replyId;
        }

        const res = await axios.post("/communities/student/comments", body, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        return {
            id: res.data.id,
            content: res.data.content,
            replies: [],
            showReplies: false,
            postId: res.data.post_id,
            user: res.data.user,
            hasReplies: false,
            replyId: res.data.reply_id,
        };
    }
);

// 3. 대댓글 목록 조회 (2depth)
export const loadReplies = createAsyncThunk(
    "comment/loadReplies",
    async ({ postId, commentId, page = 1, size = 10 }) => {
        const res = await axios.get(
            `/communities/student/posts/${postId}/comments/${commentId}/replies`,
            { params: { page, size } }
        );
        return {
            commentId,
            replies: res.data.items.map(r => ({
                id: r.id,
                content: r.content,
                user: r.user,
                hasReplies: r.has_replies,
                postId: r.post_id,
                replyId: r.reply_id,
                created_at: r.created_at,   // 추가
                updated_at: r.updated_at,   // 추가
            })),
        };
    }
);

// 4. 대댓글 작성 (addComment와 동일한 엔드포인트 사용)
export const addReply = createAsyncThunk(
    "comment/addReply",
    async ({ postId, commentId, content }) => {
        const res = await axios.post("/communities/student/comments", {
            post_id: postId,
            reply_id: commentId, // 부모 댓글 ID
            content,
        });

        return {
            commentId, // 어느 댓글의 대댓글인지
            reply: {
                id: res.data.id,
                content: res.data.content,
                user: res.data.user,
                hasReplies: false,
                postId: res.data.post_id,
                replyId: res.data.reply_id,
            },
        };
    }
);

// 5. 댓글/대댓글 삭제
export const deleteComment = createAsyncThunk(
    "comment/deleteComment",
    async ({ commentId }) => {
        await axios.delete(`/communities/student/comments/${commentId}`);
        return commentId;
    }
);

// 6. 댓글/대댓글 수정
export const updateComment = createAsyncThunk(
    "comment/updateComment",
    async ({ commentId, content }) => {
        const res = await axios.patch(
            `/communities/student/comments/${commentId}`,
            { content }
        );
        return {
            commentId,
            content: res.data.content,
        };
    }
);

const commentSlice = createSlice({
    name: "comment",
    initialState: {
        comments: [],
        loading: false,
        error: null,
    },
    reducers: {
        toggleReplies: (state, action) => {
            const comment = state.comments.find(c => c.id === action.payload);
            if (comment) comment.showReplies = !comment.showReplies;
        },
    },
    extraReducers: (builder) => {
        builder
            // 댓글 목록 조회
            .addCase(loadComments.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadComments.fulfilled, (state, action) => {
                state.comments = action.payload;
                state.loading = false;
            })
            .addCase(loadComments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            // 댓글 작성
            .addCase(addComment.fulfilled, (state, action) => {
                // reply_id가 null이면 최상위 댓글
                if (!action.payload.replyId) {
                    state.comments.unshift(action.payload);
                } else {
                    // reply_id가 있으면 해당 댓글의 replies에 추가
                    const parentComment = state.comments.find(
                        c => c.id === action.payload.replyId
                    );
                    if (parentComment) {
                        parentComment.replies.push(action.payload);
                        parentComment.hasReplies = true;
                    }
                }
            })

            // 대댓글 목록 조회
            .addCase(loadReplies.fulfilled, (state, action) => {
                const comment = state.comments.find(
                    c => c.id === action.payload.commentId
                );
                if (comment) {
                    comment.replies = action.payload.replies;
                }
            })

            // 대댓글 작성
            .addCase(addReply.fulfilled, (state, action) => {
                const comment = state.comments.find(
                    c => c.id === action.payload.commentId
                );
                if (comment) {
                    comment.replies.push(action.payload.reply);
                    comment.hasReplies = true;
                }
            })

            // 댓글/대댓글 삭제
            .addCase(deleteComment.fulfilled, (state, action) => {
                // 최상위 댓글 삭제
                state.comments = state.comments.filter(
                    c => c.id !== action.payload
                );
                // 대댓글 삭제
                state.comments.forEach(c => {
                    c.replies = c.replies.filter(r => r.id !== action.payload);
                    // replies가 비었으면 hasReplies false
                    if (c.replies.length === 0) {
                        c.hasReplies = false;
                    }
                });
            })

            // 댓글/대댓글 수정
            .addCase(updateComment.fulfilled, (state, action) => {
                // 최상위 댓글 수정
                const comment = state.comments.find(
                    c => c.id === action.payload.commentId
                );
                if (comment) {
                    comment.content = action.payload.content;
                }

                // 대댓글 수정
                state.comments.forEach(c => {
                    const reply = c.replies.find(
                        r => r.id === action.payload.commentId
                    );
                    if (reply) {
                        reply.content = action.payload.content;
                    }
                });
            });
    },
});

export const { toggleReplies } = commentSlice.actions;
export default commentSlice.reducer;