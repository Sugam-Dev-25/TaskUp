import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "../../../api/boardApiClient";
import type { Task, CommentBlock } from "../../../types/board.Types";

type Progress = (percent: number) => void;
const msg = (err: any) => err.response?.data?.message || err.message;
const progressOf = (cb?: Progress) => (e: { loaded: number; total?: number }) => {
  if (e.total && cb) cb(Math.round((e.loaded * 100) / e.total));
};

export const addComment = createAsyncThunk<Task, { taskId: string; formData: FormData; onProgress?: Progress }, { rejectValue: string }>(
  "comments/add",
  async ({ taskId, formData, onProgress }, { rejectWithValue }) => {
    try {
      return (await axiosClient.post(`/api/tasks/${taskId}/comments`, formData, { withCredentials: true, onUploadProgress: progressOf(onProgress) })).data;
    } catch (err: any) { return rejectWithValue(msg(err)); }
  }
);
export const editComment = createAsyncThunk<Task, { taskId: string; commentId: string; blocks: CommentBlock[] }, { rejectValue: string }>(
  "comments/edit",
  async ({ taskId, commentId, blocks }, { rejectWithValue }) => {
    try {
      return (await axiosClient.patch(`/api/tasks/${taskId}/comments/${commentId}`, { blocks }, { withCredentials: true })).data;
    } catch (err: any) { return rejectWithValue(msg(err)); }
  }
);
export const deleteComment = createAsyncThunk<Task, { taskId: string; commentId: string }, { rejectValue: string }>(
  "comments/delete",
  async ({ taskId, commentId }, { rejectWithValue }) => {
    try {
      return (await axiosClient.delete(`/api/tasks/${taskId}/comments/${commentId}`, { withCredentials: true })).data;
    } catch (err: any) { return rejectWithValue(msg(err)); }
  }
);