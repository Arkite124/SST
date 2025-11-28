import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
axios.defaults.baseURL = "http://localhost:8000";
axios.defaults.withCredentials = true;

// ===========================
// 1. 댓글 목록 조회 (상위 댓글만)
// ===========================
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
            reply_count: 0, // 초기값
            created_at: c.created_at,
            updated_at: c.updated_at,
            replyId: c.reply_id,
        }));
    }
);

// ===========================
// 2. 댓글 작성 (상위 댓글)
// ===========================
export const addComment = createAsyncThunk(
    "comment/addComment",
    async ({ postId, content, replyId = null }) => {
        const body = { post_id: postId, content };
        if (replyId !== null) body.reply_id = replyId;

        const res = await axios.post("/communities/student/comments", body, {
            headers: { "Content-Type": "application/json" },
        });

        return {
            id: res.data.id,
            content: res.data.content,
            replies: [],
            showReplies: false,
            postId: res.data.post_id,
            user: res.data.user,
            hasReplies: false,
            reply_count: 0,
            replyId: res.data.reply_id,
            created_at: res.data.created_at || new Date().toISOString(),
            updated_at: res.data.updated_at || new Date().toISOString(),
        };
    }
);

// ===========================
// 3. 대댓글 목록 조회
// ===========================
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
                created_at: r.created_at,
                updated_at: r.updated_at,
            })),
        };
    }
);

// ===========================
// 4. 대댓글 작성
// ===========================
export const addReply = createAsyncThunk(
    "comment/addReply",
    async ({ postId, commentId, content }) => {
        const res = await axios.post("/communities/student/comments", {
            post_id: postId,
            reply_id: commentId,
            content,
        });

        return {
            commentId,
            reply: {
                id: res.data.id,
                content: res.data.content,
                user: res.data.user,
                hasReplies: false,
                postId: res.data.post_id,
                replyId: res.data.reply_id,
                created_at: res.data.created_at || new Date().toISOString(),
                updated_at: res.data.updated_at || new Date().toISOString(),
            },
        };
    }
);

// ===========================
// 5. 댓글/대댓글 삭제
// ===========================
export const deleteComment = createAsyncThunk(
    "comment/deleteComment",
    async ({ commentId }) => {
        await axios.delete(`/communities/student/comments/${commentId}`);
        return commentId;
    }
);

// ===========================
// 6. 댓글/대댓글 수정
// ===========================
export const updateComment = createAsyncThunk(
    "comment/updateComment",
    async ({ commentId, content }) => {
        const res = await axios.patch(`/communities/student/comments/${commentId}`, { content });
        return {
            commentId,
            content: res.data.content,
            updated_at: res.data.updated_at || new Date().toISOString(),
        };
    }
);

// ===========================
// Slice
// ===========================
const commentSlice = createSlice({
    name: "comment",
    initialState: { comments: [], loading: false, error: null },
    reducers: {
        toggleReplies: (state, action) => {
            const comment = state.comments.find(c => c.id === action.payload);
            if (comment) comment.showReplies = !comment.showReplies;
        },
    },
    extraReducers: builder => {
        builder
            // 댓글 목록
            .addCase(loadComments.pending, state => { state.loading = true; })
            .addCase(loadComments.fulfilled, (state, action) => {
                state.comments = action.payload.map(c => ({
                    ...c,
                    reply_count: c.replies.length,
                    hasReplies: c.replies.length > 0,
                    showReplies: false,
                }));
                state.loading = false;
            })
            .addCase(loadComments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            // 댓글 작성
            .addCase(addComment.fulfilled, (state, action) => {
                const payload = action.payload;
                if (!payload.replyId) {
                    state.comments.unshift(payload);
                } else {
                    const parent = state.comments.find(c => c.id === payload.replyId);
                    if (parent) {
                        parent.replies.push(payload);
                        parent.hasReplies = true;
                        parent.reply_count = parent.replies.length;
                    }
                }
            })

            // 대댓글 목록
            .addCase(loadReplies.fulfilled, (state, action) => {
                const comment = state.comments.find(c => c.id === action.payload.commentId);
                if (comment) {
                    comment.replies = action.payload.replies;
                    comment.reply_count = action.payload.replies.length;
                    comment.hasReplies = action.payload.replies.length > 0;
                }
            })

            // 대댓글 작성
            .addCase(addReply.fulfilled, (state, action) => {
                const comment = state.comments.find(c => c.id === action.payload.commentId);
                if (comment) {
                    comment.replies.push(action.payload.reply);
                    comment.hasReplies = true;
                    comment.reply_count = comment.replies.length;
                }
            })

            // 삭제
            .addCase(deleteComment.fulfilled, (state, action) => {
                state.comments = state.comments.filter(c => c.id !== action.payload);
                state.comments.forEach(c => {
                    c.replies = c.replies.filter(r => r.id !== action.payload);
                    c.reply_count = c.replies.length;
                    if (c.replies.length === 0) c.hasReplies = false;
                });
            })

            // 수정
            .addCase(updateComment.fulfilled, (state, action) => {
                const { commentId, content, updated_at } = action.payload;
                const comment = state.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.content = content;
                    comment.updated_at = updated_at;
                }
                state.comments.forEach(c => {
                    const reply = c.replies.find(r => r.id === commentId);
                    if (reply) {
                        reply.content = content;
                        reply.updated_at = updated_at;
                    }
                });
            });
    },
});

export const { toggleReplies } = commentSlice.actions;
export default commentSlice.reducer;
