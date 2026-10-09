import { Clock, ArrowSquareOut } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
import type { Task } from "../../types/board.Types";

interface Props {
  task: Task | null;
  onClose: () => void;
}

export const TaskTimePanel = ({ task, onClose }: Props) => {
  if (!task) return null;
  const { role } = useParams<{ role: string }>(); // adjust to however you access current role

  const msToHours = (ms: number = 0) => (ms / 3600000).toFixed(1);
  const byUser = task.timeManagement?.byUser ?? [];
  const totalMs = byUser.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="w-[35%] border-l border-gray-100 p-6 overflow-y-auto bg-gray-50/40 flex flex-col">
      <button onClick={onClose} className="text-xs text-gray-400 hover:text-black mb-4 text-left">
        ✕ Close
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between pb-4 mb-6 border-b border-gray-100">
          <Link to={`/${role}/dashboard/tasks/${task.id}`} className="group flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {task.title}
            </h2>
            <ArrowSquareOut size={16} className="text-gray-300 group-hover:text-blue-500 shrink-0" />
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{task.priority}</span>
          {task.due_date && (
            <span className="text-[10px] text-gray-400">
              Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {task.assignedTo && task.assignedTo.length > 0 && (
          <div className="flex -space-x-2 mb-5">
            {task.assignedTo.map((u: any) => (
              <div key={u.id} title={u.full_name} className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                {u.full_name?.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Clock size={14} weight="bold" /> Time by Member
          </h4>
          {byUser.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No time logged yet.</p>
          ) : (
            <div className="space-y-3">
              {byUser.map((entry, i) => (
                <div key={entry.user?.id ?? i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                      {entry.user?.full_name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm text-gray-700">{entry.user?.full_name ?? "Unknown"}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{msToHours(entry.duration)} hrs</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                <span className="text-sm font-black text-slate-800">{msToHours(totalMs)} hrs</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};