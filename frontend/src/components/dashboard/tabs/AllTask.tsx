import { useAppSelector } from '../../redux/app/hook';
import {
    Clock,
    WarningCircle,
    Users,
    ChartBar,
    CalendarBlank,
    Hourglass,
} from '@phosphor-icons/react';
import { getAvatarColor } from "../../utils/avatarColor";
import { getColumnColor } from "../../utils/columnColors"; 
import { useState } from 'react';
import type { Task } from '../../types/board.Types';
import { TaskTimePanel } from '../Task/TaskTimePanel';

export const AllTask = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { task: tasks, loading } = useAppSelector((state) => state.task);
  const msToHours = (ms: number = 0) => (ms / 3600000).toFixed(1);
  
  const calculateProgress = (timeManagement: any) => {
      const goalMs = (timeManagement?.estimated_time || 0) * 3600000;
      const loggedMs = timeManagement?.total_logged_time  || 0;
      const percent = goalMs > 0 ? Math.min((loggedMs / goalMs) * 100, 100) : 0;
      const isOvertime = loggedMs > goalMs && goalMs > 0;
      const overtimeMs = isOvertime ? loggedMs - goalMs : 0;
      return { percent, isOvertime, overtimeHours: msToHours(overtimeMs) };
  };
  
  const boards = useAppSelector((state) => state.board.boards);
  const columns = useAppSelector((state) => state.column.columns);

  if (loading === 'pending') {
      return (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="animate-spin text-indigo-600">
                  <Clock size={32} weight="bold" />
              </div>
              <span className="text-gray-500 font-medium">Syncing Global Tasks...</span>
          </div>
      );
  }

  return (
      <div className="flex h-full bg-gray-50 font-sans overflow-hidden">
          {/* LEFT: table / content area, shrinks when a task is selected */}
          <div className={`transition-all duration-300 ${selectedTask ? "w-[65%]" : "w-full"} p-4 sm:p-6 overflow-y-auto`}>
              <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-bold font-black text-black">
                      Global Task Overview
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                      Real-time resource and time tracking across all boards.
                    </p>
                  </div>

                  <div className="bg-black px-5 py-2 rounded-full border border-black/10 shadow-sm flex items-center gap-3">
                    <ChartBar size={18} weight="fill" className="text-white" />
                    <span className="text-sm font-semibold text-white">
                      {tasks?.length || 0} Active Tasks
                    </span>
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-black text-left">
                      <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-widest">Identify</th>
                        <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-widest">Team</th>
                        <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-widest">Urgency</th>
                        <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-widest">Time Progress</th>
                        <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-widest">Timeline</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {tasks.map((t: any) => {
                        const { percent, isOvertime, overtimeHours } = calculateProgress(t.timeManagement);
                        const columnStyle = getColumnColor(t.column?.name || "No Status");
                        const isSelected = selectedTask?.id === t.id;

                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            {/* IDENTIFY */}
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-base font-bold capitalize text-black">{t.title}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-semibold capitalize text-gray-600">
                                    {boards.find(b => b.id === t.board_id)?.name}
                                  </span>
                                  <span className="text-gray-300">•</span>
                                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold uppercase ${columnStyle.bg} ${columnStyle.text} ${columnStyle.border}`}>
                                    {columns[t.board_id]?.find(c => c.id === t.column_id)?.name}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* TEAM */}
                            <td className="px-6 py-5">
                              <div className="flex -space-x-2">
                                {t.assignedTo?.length > 0 ? (
                                  t.assignedTo.map((user: any, i: number) => (
                                    <div
                                      key={user.id}
                                      className="h-9 w-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                      style={{ backgroundColor: getAvatarColor(user.full_name || i) }}
                                    >
                                      {user.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                  ))
                                ) : (
                                  <Users size={18} className="text-gray-400" />
                                )}
                              </div>
                            </td>

                            {/* URGENCY */}
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase bg-black/10 text-black">
                                {t.priority}
                              </span>
                            </td>

                            {/* TIME PROGRESS */}
                            <td className="px-6 py-5 min-w-[220px]">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Hourglass size={12} />
                                    {msToHours(t.timeManagement?.total_logged_time)}h / {t.timeManagement?.estimated_time || 0}h
                                  </span>
                                  {isOvertime && (
                                    <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
                                      <WarningCircle weight="fill" size={12} />
                                      +{overtimeHours}h
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${isOvertime ? "bg-rose-500" : "bg-black"}`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* TIMELINE */}
                            <td className="px-6 py-5 text-gray-600">
                              <div className="flex items-center gap-2">
                                <CalendarBlank size={14} />
                                <span className="text-sm font-medium">
                                  {t.due_date ? new Date(t.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "No Date"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>

          {/* RIGHT: detail panel (shares parent height instead of overlaying fixed) */}
          <TaskTimePanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      </div>
  );
};