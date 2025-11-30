import { createAsyncThunk,createSlice } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance";

// 📌 관리자 전체 문의 조회
export const adminFetchPosts = createAsyncThunk(
    "adminSupport/fetchPosts",
    async (params, thunkAPI) => {
        try {
            const res = await axiosInstance.get("/admin/customer-support/posts", {
                params,
            });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data || "관리자 조회 실패");
        }
    }
);

// 📌 관리자 문의 상세 조회
export const adminFetchPostDetail = createAsyncThunk(
    "adminSupport/fetchPostDetail",
    async (postId, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/admin/customer-support/posts/${postId}`);
            return res.data;
        } catch  {
            return thunkAPI.rejectWithValue("상세 조회 실패");
        }
    }
);

// 📌 관리자 상태 변경
export const adminUpdateStatus = createAsyncThunk(
    "adminSupport/updateStatus",
    async ({ postId, status }, thunkAPI) => {
        try {
            const res = await axiosInstance.patch(
                `/admin/customer-support/posts/${postId}/status`,
                { status }
            );
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue("상태 변경 실패");
        }
    }
);

// 📌 관리자 댓글 작성
export const adminCreateComment = createAsyncThunk(
    "adminSupport/createComment",
    async ({ postId, replyId = null, content }, thunkAPI) => {
        try {
            const res = await axiosInstance.post(`/admin/customer-support/comments`, {
                post_id: postId,
                reply_id: replyId,
                content,
            });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue("댓글 작성 실패");
        }
    }
);

// 📌 관리자 댓글 삭제
export const adminDeleteComment = createAsyncThunk(
    "adminSupport/deleteComment",
    async (commentId, thunkAPI) => {
        try {
            await axiosInstance.delete(`/admin/customer-support/comments/${commentId}`);
            return commentId;
        } catch {
            return thunkAPI.rejectWithValue("댓글 삭제 실패");
        }
    }
);
const initialState = {
    posts: [],
    postDetail: null,
    page: 1,
    size: 20,
    loading: false,
    error: null,
};
const supportAdminSlice = createSlice({
    name: "adminSupport",
    initialState,
    reducers: {
        setPage: (state, action) => {
            state.page = action.payload;
        },
        resetDetail: (state) => {
            state.postDetail = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(adminFetchPosts.pending, (state) => {
                state.loading = true;
            })
            .addCase(adminFetchPosts.fulfilled, (state, action) => {
                state.loading = false;
                state.posts = action.payload;
            })
            .addCase(adminFetchPosts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(adminFetchPostDetail.fulfilled, (state, action) => {
                state.postDetail = action.payload;
            })
            .addCase(adminCreateComment.fulfilled, (state, action) => {
                state.postDetail.comments.push(action.payload);
            })
            .addCase(adminDeleteComment.fulfilled, (state, action) => {
                state.postDetail.comments = state.postDetail.comments.filter(
                    (c) => c.id !== action.payload
                );
            });
    },
});

export const { setPage, resetDetail } = supportAdminSlice.actions;
export default supportAdminSlice.reducer;