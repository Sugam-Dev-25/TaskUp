import { createContext } from "react";
import type { Board, Task } from "../types/allType";

export interface BoardProviderProps {
  board: Board | null;
  loading: boolean;
  task: Task[];
  
  getTaskByColumn: (columnId: string) => Task[];
  addMember: (memberId: string) => void;
  addColumn: (name: string) => void;
  deleteColumn: (columnId: string) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveTask: (taskId: string, toColumnId: string, toPosition: number) => void;
  // Updated to support FormData and async/await in the UI
  addComment: (taskId: string, formData: FormData) => Promise<any>;
}

export const BoardContext = createContext<BoardProviderProps | null>(null);