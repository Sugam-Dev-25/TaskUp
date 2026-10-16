import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "../../../api/boardApiClient";
import type { Task } from "../../../types/board.Types";

const msg = (err: any) => err.response?.data?.message || err.message;

export const uploadFiles = createAsyncThunk<Task, { taskId: string; formData: FormData; onProgress?: (p: number) => void }, { rejectValue: string }>(
  "attachments/upload",
  async ({ taskId, formData, onProgress }, { rejectWithValue }) => {
    try {
      return (await axiosClient.post(`/api/tasks/${taskId}/upload`, formData, {
        withCredentials: true,
        onUploadProgress: (e) => { if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total)); },
      })).data;
    } catch (err: any) { return rejectWithValue(msg(err)); }
  }
);
export const deleteFiles = createAsyncThunk<Task, { taskId: string; fileId: string }, { rejectValue: string }>(
  "attachments/delete",
  async ({ taskId, fileId }, { rejectWithValue }) => {
    try {
      return (await axiosClient.delete(`/api/tasks/${taskId}/upload/${fileId}`, { withCredentials: true })).data;
    } catch (err: any) { return rejectWithValue(msg(err)); }
  }
);