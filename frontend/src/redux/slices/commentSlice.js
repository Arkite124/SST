// src/redux/slices/commentSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    comments: [], // 댓글 + 대댓글
};

const commentSlice = createSlice({
    name: "comment",
    initialState,
    reducers: {
        setComments(state, action) {
            state.comments = action.payload;
        },
        addComment(state, action) {
            state.comments.push(action.payload);
        },
        toggleReplies(state, action) {
            const comment = state.comments.find(c => c.id === action.payload);
            if (comment) comment.showReplies = !comment.showReplies;
        },
        addReply(state, action) {
            const { commentId, reply } = action.payload;
            const comment = state.comments.find(c => c.id === commentId);
            if (comment) comment.replies.push(reply);
        },
    },
});

export const { setComments, addComment, toggleReplies, addReply } = commentSlice.actions;
export default commentSlice.reducer;
