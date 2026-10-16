import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosClient from "../../../api/boardApiClient";
import type { Task } from "../../../types/board.Types";

export interface ActiveTimer { taskId: string; taskTitle: string; startedAt: string }
export interface TimerRejection { message: string; activeTaskId?: string | null }

export const fetchActiveTimer = createAsyncThunk<ActiveTimer | null>(
  "timer/fetchActive",
  async () => (await axiosClient.get("/api/tasks/timers/active", { withCredentials: true })).data
);

export interface TimerRejection { code?: string; message: string; activeTaskId?: string | null }

export const toggleTimer = createAsyncThunk<Task, { taskId: string }, { rejectValue: TimerRejection }>(
  "timer/toggle",
  async ({ taskId }, { dispatch, rejectWithValue }) => {
    try {
      const res = await axiosClient.post(`/api/tasks/${taskId}/timer`, {}, { withCredentials: true });
      dispatch(fetchActiveTimer());
      return res.data;
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 409) dispatch(fetchActiveTimer());
      return rejectWithValue({ code: data?.code, message: data?.message || err.message, activeTaskId: data?.activeTaskId ?? null });
    }
  }
);