import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axiosClient from "../../../api/notificationApiClient";
import type { Notification } from "../../../types/notifications.Types";

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: "idle" | "pending" | "fulfilled" | "failed";
    error: string | null;
    currentUserId: string
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    loading: "idle",
    error: null,
    currentUserId:""
};

export const fetchNotifications = createAsyncThunk<Notification[], void, { rejectValue: string }>(
    "notifications/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const res = await axiosClient.get("/api/notifications");
            return res.data.data; // controller wraps in { success, data }
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

export const markAsRead = createAsyncThunk<number, number, { rejectValue: string }>(
    "notifications/markAsRead",
    async (id, { rejectWithValue }) => {
        try {
            await axiosClient.patch(`/api/notifications/${id}/read`);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

export const markAllNotificationsAsRead = createAsyncThunk<void, void, { rejectValue: string }>(
    "notifications/markAllAsRead",
    async (_, { rejectWithValue }) => {
        try {
            await axiosClient.patch("/api/notifications/read-all");
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        // Use this to add a notification in real-time if using Socket.io
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.unshift(action.payload);
            state.unreadCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = "pending";
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
    state.loading = "fulfilled";
    state.notifications = action.payload;

    // 💡 Update unread calculation based on user presence in readBy array
    // You need the current user ID here, which might be tricky in the slice.
    // A better approach is to calculate this in the component, or 
    // send the user ID in the action payload.
   state.unreadCount = action.payload.filter((n) => !n.is_read).length;
})
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload as string;
            })
            // Optimistic update for marking as read
            .addCase(markAsRead.fulfilled, (state, action) => {
                const index = state.notifications.findIndex((n) => n.id === action.payload);
                if (index !== -1 && !state.notifications[index].is_read) {
                    state.notifications[index].is_read = true;
                    state.unreadCount -= 1;
                }
            })
            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.notifications.forEach(n => n.is_read = true);
                state.unreadCount = 0;
            });
    },
});

export const { addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;