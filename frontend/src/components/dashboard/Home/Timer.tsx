import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import type { TimeManagement } from "../../types/board.Types";
import { Play, Pause, WarningCircle, Clock, X } from "@phosphor-icons/react";
import { fetchActiveTimer, toggleTimer } from "../../redux/features/Timer/timerThunks";

interface TimerProps {
  taskId: string;
  dueDate?: string;
  estimatedTime?: number;
  timeData?: TimeManagement;
  disabled?: boolean; // closed tasks
}
interface TimerSwitchError { code?: string; message?: string; activeTaskId?: string | null }

const parseTimerError = (payload: unknown): TimerSwitchError => {
  if (payload && typeof payload === "object") return payload as TimerSwitchError;
  if (typeof payload === "string") {
    try { return JSON.parse(payload); } catch { return { message: payload }; }
  }
  return {};
};

const formatTime = (ms: number) => {
  const s = Math.max(0, ms);
  return `${Math.floor(s / 3600000)}h ${Math.floor((s % 3600000) / 60000)}m ${Math.floor((s % 60000) / 1000)}s`;
};

export const Timer = ({ taskId, timeData, dueDate, estimatedTime, disabled = false }: TimerProps) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.login.user);
  const active = useAppSelector((s) => s.timer.active);

  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [timerError, setTimerError] = useState("");

  const myTimer = timeData?.activeTimers?.find((t) => String(t.user.id) === String(currentUser?.id));
  const isRunning = Boolean(myTimer);
  const activeStartTime = myTimer?.active_start_time ?? null;
  const myLoggedMs = timeData?.byUser?.find((e) => String(e.user.id) === String(currentUser?.id))?.duration ?? 0;

  useEffect(() => {
    if (!isRunning || !activeStartTime) { setElapsed(0); return; }
    const tick = () => {
      const start = new Date(activeStartTime).getTime();
      setElapsed(Number.isFinite(start) ? Math.max(0, Date.now() - start) : 0);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [isRunning, activeStartTime]);

  const goalMs = (estimatedTime || timeData?.estimated_time || 0) * 3600000;
  const myTotalMs = myLoggedMs + elapsed;
  const capped = goalMs > 0 ? Math.min(myTotalMs, goalMs) : myTotalMs;
  const goalReached = goalMs > 0 && myTotalMs >= goalMs;

  let liveDelay = timeData?.delay || 0;
  if (goalMs > 0 && myTotalMs > goalMs) liveDelay += myTotalMs - goalMs;
  if (isRunning && dueDate && activeStartTime) {
    const deadline = new Date(dueDate).getTime();
    if (Number.isFinite(deadline) && Date.now() > deadline && (goalMs === 0 || myTotalMs <= goalMs)) {
      const start = new Date(activeStartTime).getTime();
      liveDelay += start > deadline ? elapsed : Date.now() - deadline;
    }
  }

  const closeConfirm = () => { setShowConfirm(false); setPendingTaskId(null); setBlockingTaskId(null); setTimerError(""); };

  const handleTimerClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (switching || disabled) return;
    setTimerError("");
    try {
      await dispatch(toggleTimer({ taskId })).unwrap();
    } catch (error) {
      const parsed = parseTimerError(error);
      if (parsed.code === "TIMER_ALREADY_RUNNING") {
        setPendingTaskId(taskId);
        setBlockingTaskId(parsed.activeTaskId ? String(parsed.activeTaskId) : null);
        setShowConfirm(true);
        return;
      }
      setTimerError(parsed.message || "Unable to update the timer. Please try again.");
    }
  };

  const handleConfirmSwitch = async () => {
    if (!pendingTaskId || switching) return;
    const stopId = blockingTaskId ?? (active && active.taskId !== pendingTaskId ? active.taskId : null);
    if (!stopId) { setTimerError("Could not identify the running timer. Close this popup and try again."); return; }
    setSwitching(true);
    setTimerError("");
    try {
      await dispatch(toggleTimer({ taskId: stopId })).unwrap();        // stops the other task, its totals update
      await dispatch(toggleTimer({ taskId: pendingTaskId })).unwrap(); // starts this one
      closeConfirm();
    } catch (error) {
      setTimerError(parseTimerError(error).message || "Could not switch timers. Please try again.");
      dispatch(fetchActiveTimer()); // resync with the server
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-col items-start px-1">
          <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {goalReached ? "Goal Reached" : "My Time Logged"}
          </span>
          <span className={`font-mono text-sm font-bold tabular-nums ${goalReached ? "text-emerald-600" : "text-gray-800"}`}>
            {formatTime(capped)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleTimerClick}
          disabled={switching || disabled}
          aria-label={isRunning ? "Stop timer" : "Start timer"}
          title={disabled ? "This task is closed" : isRunning ? "Stop timer" : "Start timer"}
          className={`rounded-lg p-2 text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            isRunning ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
          }`}
        >
          {isRunning ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </button>
      </div>

      {liveDelay > 0 && (
        <div className="flex animate-pulse items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1">
          <WarningCircle size={14} className="text-rose-600" weight="fill" />
          <span className="text-[11px] font-bold text-rose-700">OVERTIME: {formatTime(liveDelay)}</span>
        </div>
      )}

      {timerError && !showConfirm && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{timerError}</p>}

      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => !switching && closeConfirm()}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock size={26} weight="fill" /></div>
              <button type="button" onClick={closeConfirm} disabled={switching} aria-label="Close" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Another timer is running</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              You already have a timer running{active ? <> on <b>{active.taskTitle}</b></> : " on another task"}. Stop it and start tracking this task instead?
            </p>
            {timerError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{timerError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeConfirm} disabled={switching} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleConfirmSwitch} disabled={switching} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                {switching ? "Switching..." : "Stop & Start New"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};