// components/dashboard/TaskPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../redux/app/hook";
import { TaskDetails } from "../tabs/TaskDetails";
import { getTasks } from "../../redux/features/Task/taskSlice";


export const TaskPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((s) => s.task.task);
  const columnsByBoard = useAppSelector((s) => s.column.columns);

  const task = tasks.find((t) => t.id === taskId);

  useEffect(() => {
    if (!task) dispatch(getTasks());
  }, [dispatch, task]);

  if (!task) return <div className="p-10 text-center text-gray-400">Loading task...</div>;

  const status = columnsByBoard[task.board_id]?.find((c) => c.id === task.column_id)?.name || null;

  return (
    <TaskDetails
      task={task}
      status={status}
      onClose={() => navigate(-1)}
      variant="page"
    />
  );
};