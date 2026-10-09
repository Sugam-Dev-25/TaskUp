import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task, } from "../../../types/board.Types";
import axiosClient from "../../../api/boardApiClient";
import { deleteColumn } from "../Column/columnSlice";

interface taskState {
    task: Task[];
    favorites: Task[];
    selectedTask: Task | null;
    loading: "idle" | "pending" | "fulfilled" | "failed",
    error: string | null
}

const initialState: taskState = {
    task: [],
    favorites: [],
    selectedTask: null,
    loading: 'idle',
    error: null
}
interface GetTasksParams {
    scope?: "mine" | "all" | "favorites";
    boardId?: string;
    columnId?: string;
}
export const getTasks = createAsyncThunk<Task[], GetTasksParams | undefined, { rejectValue: string }>(
    "tasks/getTasks",
    async (params, { rejectWithValue }) => {
        try {
            const query = new URLSearchParams();

            if (params?.scope) query.append("scope", params.scope);
            if (params?.boardId) query.append("boardId", params.boardId);
            if (params?.columnId) query.append("columnId", params.columnId);

            const res = await axiosClient.get(`/api/tasks?${query.toString()}`, {
                withCredentials: true,
            });

            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

export const addTask = createAsyncThunk<Task, { boardId: string, columnId: string, taskData: Partial<Task> }, { rejectValue: string }>("tasks/addTask", async ({ boardId, columnId, taskData }, { rejectWithValue }) => {
    try {
        const res = await axiosClient.post(`/api/boards/${boardId}/columns/${columnId}/tasks`, taskData, { withCredentials: true })
        return res.data
    }
    catch (err: any) {
        return rejectWithValue(err.response?.data?.message || err.message)
    }
})
export const moveTask = createAsyncThunk<
    Task, // full Task object
    { taskId: string; newColumnId: string; newPosition: number },
    { rejectValue: string }
>(
    "task/moveTask",
    async ({ taskId, newColumnId, newPosition }, { rejectWithValue }) => {
        try {
            const res = await axiosClient.patch(
                `/api/tasks/${taskId}/move`,
                { newColumnId, newPosition },
                { withCredentials: true }
            );
            return res.data; // <-- full Task object
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

export const updateTask = createAsyncThunk<Task, { taskId: string, update: Partial<Task> }, { rejectValue: string }>("task/updateTask", async ({ taskId, update }, { rejectWithValue }) => {
    try {
        const res = await axiosClient.patch(`/api/tasks/${taskId}`, update, { withCredentials: true })
        return res.data
    }
    catch (error: any) {
        return rejectWithValue(error.response?.data?.message || error.message)
    }
})

export const deleteTask = createAsyncThunk("task/deleteColumn", async ({ taskId }: { taskId: string }, { rejectWithValue }) => {
    try {
        await axiosClient.delete(`/api/tasks/${taskId}`, { withCredentials: true })
        return { taskId }
    }
    catch (error: any) {
        return rejectWithValue(error.response?.data?.message | error.message)
    }
})

export const addComment = createAsyncThunk<Task, { taskId: string; formData: FormData }, { rejectValue: string }>(
    "tasks/addComment",
    async ({ taskId, formData }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post(`/api/tasks/${taskId}/comments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            });
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

export const toggleTimer = createAsyncThunk<Task, { taskId: string }, { rejectValue: string }>(
    "task/toggleTimer",
    async ({ taskId }, { rejectWithValue }) => {
        try {
            const res = await axiosClient.post(`/api/tasks/${taskId}/timer`, {}, { withCredentials: true });
            return res.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

export const uploadFiles = createAsyncThunk<Task, { taskId: string; formData: FormData }, { rejectValue: string }>("task/uploadfiles",
    async ({ taskId, formData }, { rejectWithValue }) => {
        try {
            const res = await axiosClient.post(`api/tasks/${taskId}/upload`, formData, { headers: { 'Content-Type': 'multipart/formData' }, withCredentials: true })
            return res.data
        }
        catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message)
        }
    }
)

export const deleteFiles = createAsyncThunk("task/deleteFiles", async ({ taskId, fileId }: { taskId: string, fileId: string }, { rejectWithValue }) => {
    try {
        const res = await axiosClient.delete(`/api/tasks/${taskId}/upload/${fileId}`, { withCredentials: true })
        return res.data
    }
    catch (error: any) {
        return rejectWithValue(error.response?.data?.message || error.message)
    }
})
export const toggleFavorite = createAsyncThunk<
    { taskId: string; is_favorited: boolean },
    string,
    { rejectValue: string }
>(
    "task/toggleFavorite",
    async (taskId, { rejectWithValue }) => {
        try {
            const res = await axiosClient.post(
                `/api/tasks/${taskId}/favorite`,
                {},
                { withCredentials: true }
            );

            return {
                taskId,
                is_favorited: res.data.is_favorited,
            };
        } catch (err: any) {
            console.error("Toggle favorite error:", err.response?.data || err);

            return rejectWithValue(
                err.response?.data?.message || err.message
            );
        }
    }
);

export const getFavoriteTasks = createAsyncThunk<Task[], void, { rejectValue: string }>(
    "tasks/getFavorites",
    async (_, { rejectWithValue }) => {
        try {
            const res = await axiosClient.get(`/api/tasks?scope=favorites`, { withCredentials: true });
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
)



const taskSlice = createSlice({
    name: "taskSlice",
    initialState,
    reducers: {
        clearTasks: (state) => {
            state.task = [];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(addTask.pending, (state) => { state.loading = "pending"; state.error = null; })
            .addCase(addTask.fulfilled, (state, action) => {
                state.loading = "fulfilled";
                state.task.push(action.payload);
            })
            .addCase(addTask.rejected, (state, action) => { state.loading = "failed"; state.error = action.payload as string; })

            .addCase(moveTask.pending, (state, action) => {
                state.loading = "pending";
                const { taskId, newColumnId, newPosition } = action.meta.arg;
                const taskToMove = state.task.find(t => t.id === taskId);
                if (taskToMove) {
                    taskToMove.column_id = newColumnId;
                    taskToMove.position = newPosition;
                }
            })
            .addCase(moveTask.fulfilled, (state, action: PayloadAction<Task>) => {
                state.loading = "fulfilled";

                const index = state.task.findIndex(t => t.id === action.payload.id);

                if (index !== -1) {
                    state.task[index] = action.payload; // fully replace with server version
                }

                // Update selectedTask if it's the same task
                if (state.selectedTask?.id === action.payload.id) {
                    state.selectedTask = action.payload;
                }
            })
            .addCase(moveTask.rejected, (state, action) => { state.loading = "failed"; state.error = action.payload as string; })
            .addCase(updateTask.pending, (state) => { state.loading = "pending"; })
            .addCase(updateTask.fulfilled, (state, action) => {
                state.loading = "fulfilled";
                const index = state.task.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.task[index] = { ...state.task[index], ...action.payload };
                }
            })
            .addCase(updateTask.rejected, (state, action) => { state.loading = "failed"; state.error = action.payload as string; })
            .addCase(deleteTask.pending, (state) => { state.loading = "pending"; })
            .addCase(deleteTask.fulfilled, (state, action) => {
                state.loading = "fulfilled";
                state.task = state.task.filter(t => t.id !== (action.payload as any).taskId);
            })
            .addCase(deleteTask.rejected, (state) => { state.loading = "failed"; })
            .addCase(addComment.pending, (state) => {
                state.loading = "pending";
            })
            .addCase(addComment.fulfilled, (state, action) => {
                state.loading = "fulfilled";

                // Update the task in the main array
                const index = state.task.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.task[index] = {
                        ...state.task[index],
                        ...action.payload,
                    };
                }

                // IMPORTANT: Update selectedTask so the comment appears in the modal instantly
                state.selectedTask = action.payload;
            })
            .addCase(addComment.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload as string;
            })
            .addCase(toggleTimer.pending, (state) => {
                state.loading = "pending";
            })
            .addCase(toggleTimer.fulfilled, (state, action) => {
                state.loading = "fulfilled";
                const index = state.task.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.task[index] = { ...state.task[index], ...action.payload };
                }
            })

            .addCase(toggleTimer.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload as string;
            })
            .addCase(deleteColumn.fulfilled, (state, action) => {
                const { columnId } = action.payload;
                state.task = state.task.filter((t) => t.column_id !== columnId);
            })
            .addCase(getTasks.pending, (state) => {
                state.loading = "pending";
                state.error = null;
            })
            .addCase(getTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
                state.loading = "fulfilled";
                state.task = action.payload;
            })
            .addCase(getTasks.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload as string;
            })
            .addCase(uploadFiles.pending, (state) => {
                state.loading = "pending";
            })
            .addCase(uploadFiles.fulfilled, (state, action) => {
                const index = state.task.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.task[index] = action.payload;
                }
                state.selectedTask = action.payload;
                state.loading = "fulfilled";
            })
            .addCase(uploadFiles.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload as string;
            })
            .addCase(deleteFiles.fulfilled, (state, action) => {
                state.selectedTask = action.payload
            })
            .addCase(getFavoriteTasks.fulfilled, (state, action) => {
                state.favorites = action.payload;
            })
            .addCase(toggleFavorite.fulfilled, (state, action) => {
    const { taskId, is_favorited } = action.payload;

    const task = state.task.find((t) => t.id === taskId);

    if (task) {
        task.is_favorited = is_favorited;
    }

    if (state.selectedTask?.id === taskId) {
        state.selectedTask.is_favorited = is_favorited;
    }

    const favoriteTask = state.favorites.find((t) => t.id === taskId);

    if (is_favorited && !favoriteTask && task) {
        state.favorites.push({
            ...task,
            is_favorited: true,
        });
    }

    if (!is_favorited) {
        state.favorites = state.favorites.filter(
            (t) => t.id !== taskId
        );
    }

    state.loading = "fulfilled";
    state.error = null;
})
.addCase(toggleFavorite.rejected, (state, action) => {
    state.loading = "failed";
    state.error = action.payload as string;
})

            
    }
})
export default taskSlice.reducer
export const { clearTasks } = taskSlice.actions;