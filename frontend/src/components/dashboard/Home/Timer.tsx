import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import { toggleTimer } from "../../redux/features/Task/taskSlice";
import type { TimeManagement } from "../../types/board.Types";
import { Play, Pause, WarningCircle } from "@phosphor-icons/react";

interface TimerProps {
    taskId: string;
    dueDate?: string;
    estimatedTime?: number;
    timeData?: TimeManagement;
}

export const Timer = ({ taskId, timeData, dueDate, estimatedTime = 0 }: TimerProps) => {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((s) => s.login.user);
    const [elapsedSinceStart, setElapsedSinceStart] = useState(0);

    const myTimer = timeData?.activeTimers?.find((t) => t.user.id === currentUser?.id);
    const isRunning = !!myTimer;
    const activeStartTime = myTimer?.active_start_time ?? null;

    // This person's own accumulated time — not the shared task total.
    const myLoggedMs = timeData?.byUser?.find((e) => e.user.id === currentUser?.id)?.duration ?? 0;

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isRunning && activeStartTime) {
            interval = setInterval(() => {
                setElapsedSinceStart(Date.now() - new Date(activeStartTime).getTime());
            }, 1000);
        } else {
            setElapsedSinceStart(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRunning, activeStartTime]);

    const formatTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    // "My time" = my own logged total + my own live session, if running
    const myTotalMs = myLoggedMs + elapsedSinceStart;
    const goalMs = estimatedTime * 3600000;
    const cappedLoggedTime = goalMs > 0 ? Math.min(myTotalMs, goalMs) : myTotalMs;

    let liveDelay = timeData?.delay || 0;

    if (goalMs > 0 && myTotalMs > goalMs) {
        liveDelay += (myTotalMs - goalMs);
    }

    if (isRunning && dueDate && activeStartTime) {
        const deadline = new Date(dueDate).getTime();
        const now = new Date().getTime();
        if (now > deadline) {
            const start = new Date(activeStartTime).getTime();
            const currentSessionDelay = start > deadline ? elapsedSinceStart : now - deadline;
            if (myTotalMs <= goalMs) {
                liveDelay += currentSessionDelay;
            }
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col items-start px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        {myTotalMs > goalMs && goalMs > 0 ? "Goal Reached" : "My Time Logged"}
                    </span>
                    <span className={`font-mono font-bold text-sm tabular-nums ${myTotalMs > goalMs && goalMs > 0 ? "text-emerald-600" : "text-gray-800"}`}>
                        {formatTime(cappedLoggedTime)}
                    </span>
                </div>

                <button onClick={(e) => { e.stopPropagation(); dispatch(toggleTimer({ taskId })); }}
                    className={`p-2 rounded-lg transition-all ${isRunning ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                    {isRunning ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                </button>
            </div>

            {liveDelay > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg animate-pulse">
                    <WarningCircle size={14} className="text-rose-600" weight="fill" />
                    <span className="text-[11px] font-bold text-rose-700">
                        OVERTIME: {formatTime(liveDelay)}
                    </span>
                </div>
            )}
        </div>
    );
};