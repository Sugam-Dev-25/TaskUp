import { createSlice } from "@reduxjs/toolkit";
import { fetchActiveTimer, type ActiveTimer } from "./timerThunks";

const timerSlice = createSlice({
  name: "timer",
  initialState: { active: null as ActiveTimer | null },
  reducers: { clearActiveTimer: (s) => { s.active = null; } },
  extraReducers: (b) => { b.addCase(fetchActiveTimer.fulfilled, (s, a) => { s.active = a.payload; }); },
});
export const { clearActiveTimer } = timerSlice.actions;
export default timerSlice.reducer;