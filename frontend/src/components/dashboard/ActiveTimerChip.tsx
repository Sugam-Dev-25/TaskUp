import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StopIcon, TimerIcon } from "@phosphor-icons/react";
import { useAppDispatch, useAppSelector } from "../redux/app/hook";
import { clearActiveTimer } from "../redux/features/Timer/timerSlice";
import { fetchActiveTimer, toggleTimer, type TimerRejection } from "../redux/features/Timer/timerThunks";
import { useToast } from "../hooks/useToast";

const pad = (n: number) => String(n).padStart(2, "0");

export const ActiveTimerChip = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const showToast = useToast();
  const user = useAppSelector((s) => s.login.user);
  const active = useAppSelector((s) => s.timer.active);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(fetchActiveTimer());
    else dispatch(clearActiveTimer());
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active?.taskId, active?.startedAt]);

  if (!active || !user) return null;

  const secs = Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000));
  const clock = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    try { await dispatch(toggleTimer({ taskId: active.taskId })).unwrap(); showToast("Timer stopped"); }
    catch (err) { showToast((err as TimerRejection)?.message ?? "Could not stop the timer", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 py-1 pl-3 pr-1">
      <button onClick={() => navigate(`/${user.role}/dashboard/tasks/${active.taskId}`)} title={active.taskTitle}
        className="flex max-w-[220px] items-center gap-2 text-xs text-emerald-700">
        <TimerIcon size={14} weight="fill" className="shrink-0" />
        <span className="truncate font-semibold">{active.taskTitle}</span>
        <span className="font-mono tabular-nums">{clock}</span>
      </button>
      <button onClick={stop} disabled={busy} title="Stop timer" className="rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 disabled:opacity-50">
        <StopIcon size={12} weight="fill" />
      </button>
    </div>
  );
};