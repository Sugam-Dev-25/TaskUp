
import type{ User } from "./user.Types";
export type Column = {
  id: string;
  board_id: string;
  name: "Todo" | "In Progress" | "Delay" | "Completed";
  order_index: number | null;
  tasks: Task[];
};


export type Board = {
  id: string;
  name: string;
  owner: string;
  members: User[];
  columns: Column[];
  created_at: string;
  updated_at: string;
};

export type DailyLog = {
  id: number;
  task_id: string;
  log_date: string;
  duration: number;
};


export type TimeManagement = {
  estimatedTime: number;
  totalLoggedTime: number;
  delay: number;
  dailyLogs: DailyLog[];
  activeStartTime: string | null;
  isRunning: boolean;
};

export type Comment = {
  id: string;
  task_id: string;
  user: User | null;
  text: string | null;
  attachments: Attachment[];
  created_at: string;
};


export type Activity = {
  id: number;
  task_id: string;
  user: User | null;
  action: string;
  created_at: string;

  details?: {
    field: string | null;
    oldValue: any;
    newValue: any;
  };
};






export type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  uploadedBy: User | null;
  createdAt?: string;
};
















export type Task = {
  id: string;
  title: string;
  description: string | null;

  progress: number;
  position: number;

  priority: "Low" | "Medium" | "High" | "Critical";

  due_date: string | Date | null;
  start_date: string | Date | null;

  column_id: string;
 board_id: string;

  assignedTo: User[];

  column: Column | null;
  board: Board | null;

  

  attachments: Attachment[];
  comments: Comment[];
  activityLog: Activity[];

  timeManagement?: TimeManagement;

  created_at: Date;
  updated_at: Date;
};
