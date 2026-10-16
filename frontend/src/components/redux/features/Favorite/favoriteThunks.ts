import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "../../../api/boardApiClient";

export const toggleFavorite = createAsyncThunk<{ taskId: string; is_favorited: boolean }, string, { rejectValue: string }>(
  "favorites/toggle",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await axiosClient.post(`/api/tasks/${taskId}/favorite`, {}, { withCredentials: true });
      return { taskId, is_favorited: res.data.is_favorited };
    } catch (err: any) { return rejectWithValue(err.response?.data?.message || err.message); }
  }
);