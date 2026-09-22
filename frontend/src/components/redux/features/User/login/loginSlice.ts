import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import axiosClient from "../../../../api/userApiClient";
import { tokenStore } from "../../../../api/tokenStore";
import type { User } from "../../../../types/allType";

interface LoginSuccessPayload {
    user: User;
    redirectTo: string;
    message: string;
    accessToken: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: "idle" | "pending" | "successed" | "failed";
    error: string | null;
    redirectTo: string | null;
}

// --- INITIAL STATE ---

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    loading: "idle",
    error: null,
    redirectTo: null,
};

export const loginUsers = createAsyncThunk<
    LoginSuccessPayload,
    { email: string; password: string }, 
    { rejectValue: string }
>(
    "auth/loginUsers",
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const res = await axiosClient.post(
                "/auth/login",
                { email, password },
                { withCredentials: true } 
            );
            const data = res.data as LoginSuccessPayload;
            // requireAuth reads Authorization: Bearer <token>, not a cookie —
            // keep the access token in memory only (see tokenStore.ts) so it
            // isn't sitting in localStorage/sessionStorage for an XSS payload
            // to read. Session persistence across reloads comes from the
            // httpOnly refreshToken cookie the backend already set.
            if (data.accessToken) {
                tokenStore.set(data.accessToken);
            }
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await axiosClient.post(
        "/auth/logout",
        {},
        { withCredentials: true }
      );
      tokenStore.clear();
      dispatch(logout());
    } catch (err) {
      tokenStore.clear();
      return rejectWithValue("Logout failed");
    }
  }
);

const loginSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setAuthState: (state, action: PayloadAction<User | null>) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.loading = 'idle';
            state.error = null;
            state.redirectTo = null;
        },
        logout: (state) => {
            tokenStore.clear();
            state.user = null;
            state.isAuthenticated = false;
            state.loading = "idle";
            state.error = null;
            state.redirectTo = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUsers.pending, (state) => {
                state.loading = "pending";
                state.error = null;
                state.redirectTo = null;
            })
            .addCase(
                loginUsers.fulfilled,
                (state, action: PayloadAction<LoginSuccessPayload>) => {
                    state.loading = "successed";
                    state.isAuthenticated = true;
                    state.user = action.payload.user;
                    state.redirectTo = action.payload.redirectTo;
                    state.error = null;
                }
            )
            .addCase(loginUsers.rejected, (state, action) => {
                state.loading = "failed";
                state.isAuthenticated = false;
                state.user = null;
                state.error = (action.payload as string) || "Login failed";
                state.redirectTo = null;
            });
    },
});

export default loginSlice.reducer;
export const { setAuthState, logout, clearError } = loginSlice.actions;