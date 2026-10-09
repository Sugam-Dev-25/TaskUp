import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import { Timer } from "../Home/Timer";
import { getTasks } from "../../redux/features/Task/taskSlice";
import { useSearchParams } from "react-router-dom";
export const MyTask = () => {

    const [searchParams]=useSearchParams()
    const scopeParam=searchParams.get("scope")
    const scope: "mine"| "all"=scopeParam==="all"?"all":"mine"
 const dispatch = useAppDispatch()
    const task = useAppSelector(state => state.task.task);
    const user = useAppSelector(state => state.login.user);
    const formatHours = (ms: number) => (ms / 3600000).toFixed(1) + "h";
    const columnsByBoard = useAppSelector((state) => state.column.columns);
    const boards = useAppSelector((state) => state.board.boards);

    
   
   useEffect(() => {
  dispatch(getTasks({ scope: scope === "mine" ? "mine" : "all" }));
}, [dispatch, scope]);
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">My Tasks</h1>
                <p className="text-gray-500">Welcome back, {user?.full_name}. Here is your schedule for today.</p>
            </header>

            <div className="grid gap-4">
                {task.map(t => (
                    <div
                        key={t.id}
                        // --- ADDED CLICK HANDLER ---

                        className="group p-5 border border-gray-100 rounded-2xl bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                    >
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-gray-800">{t.title}</h3>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${t.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {t.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 font-medium">
                                    {boards.find(b => b.id === t.board_id)?.name} • <span className="text-blue-500">{columnsByBoard[t.board_id]?.find(c => c.id === t.column_id)?.name}</span>
                                </p>
                            </div>
                            {/* stopPropagation ensures clicking the timer doesn't trigger the modal */}
                            <div onClick={(e) => e.stopPropagation()}>
                                <Timer taskId={t.id} timeData={t.timeManagement} />
                            </div>
                        </div>

                        {/* Progress Bar and Stats */}
                        <div className="mt-6 flex items-center gap-6">
                            <div className="flex-grow">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1.5">
    <span>Progress towards {t.timeManagement?.estimated_time || 0}h goal</span>
    <span className="text-gray-600">{Math.round(((t.timeManagement?.total_logged_time || 0) / ((t.timeManagement?.estimated_time || 1) * 3600000)) * 100)}%</span>
</div>
<div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
    <div className="bg-blue-500 h-full transition-all duration-1000"
        style={{ width: `${Math.min(((t.timeManagement?.total_logged_time || 0) / ((t.timeManagement?.estimated_time || 1) * 3600000)) * 100, 100)}%` }}
    />
</div>
<p className="text-[10px] text-gray-400 mt-1">
    Team total: {((t.timeManagement?.total_logged_time || 0) / 3600000).toFixed(1)}h logged
    {(t.timeManagement?.byUser?.length ?? 0) > 1 && ` across ${t.timeManagement!.byUser.length} members`}
</p>
                            </div>

                            <div className="flex -space-x-1.5 overflow-hidden">
                                {t.timeManagement?.dailyLogs?.slice(-3).map((log) => (
                                    <div key={log.log_date}
                                        className="h-8 w-8 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm"
                                        title={`${log.log_date}: ${formatHours(log.duration)}`}
                                    >
                                        {formatHours(log.duration)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {task.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No tasks assigned to you yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};