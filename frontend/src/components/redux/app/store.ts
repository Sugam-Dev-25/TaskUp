import { configureStore } from '@reduxjs/toolkit';
import loginUsers from '../features/User/login/loginSlice';
import registerUser from '../features/User/register/registerSlice'
import boardSlice from "../features/Board/boardSlice"
import cloumnSlice from '../features/Column/columnSlice'
import taskSlice from '../features/Task/taskSlice'
import notificationSlice from '../features/notifications/notificationSlice';
import uiReducer from '../features/ui/loadingSlice';
import userReducer from '../features/User/userSlice';
import { listenerMiddleware } from './listenerMiddleware';
export const store = configureStore({
    reducer: {
        ui: uiReducer,
        login: loginUsers,
        register: registerUser,
        board: boardSlice,
        column: cloumnSlice,
        task: taskSlice,
        notification: notificationSlice,
        
        user: userReducer,
      
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
    .prepend(listenerMiddleware.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
