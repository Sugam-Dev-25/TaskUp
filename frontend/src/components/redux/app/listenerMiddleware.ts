import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { addMember, createBoard, deleteBoard, editBoard } from "../features/Board/boardSlice";
import { fetchNotifications } from "../features/notifications/notificationSlice";
import { addTask, deleteTask, getTasks, moveTask, updateTask, addComment } from "../features/Task/taskSlice";
import { addColumn, deleteColumn } from "../features/Column/columnSlice";

export const listenerMiddleware = createListenerMiddleware();

let lastNotificationFetch = 0;
const NOTIFICATION_REFRESH_COOLDOWN_MS = 5000; // don't refetch more than once per 5s no matter how many actions fire

listenerMiddleware.startListening({
  matcher: isAnyOf(
    addMember.fulfilled, createBoard.fulfilled, deleteBoard.fulfilled, editBoard.fulfilled,
    addTask.fulfilled, moveTask.fulfilled, updateTask.fulfilled, deleteTask.fulfilled, addComment.fulfilled,
    addColumn.fulfilled, deleteColumn.fulfilled
  ),
  effect: async (action, listenerApi) => {
    const now = Date.now();
    if (now - lastNotificationFetch > NOTIFICATION_REFRESH_COOLDOWN_MS) {
      lastNotificationFetch = now;
      listenerApi.dispatch(fetchNotifications());
    }

    if (updateTask.fulfilled.match(action) || moveTask.fulfilled.match(action)) {
      const boardId = (action.payload as any).board_id;   // fixed: real field name
      if (boardId) {
        listenerApi.dispatch(getTasks({ boardId }));
      }
    }
  },
});