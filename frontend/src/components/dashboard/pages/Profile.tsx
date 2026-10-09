// components/dashboard/tabs/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import { getFavoriteTasks, getTasks } from "../../redux/features/Task/taskSlice";
import { fetchBoard } from "../../redux/features/Board/boardSlice";
import { getAvatarColor } from "../../utils/avatarColor";
import { Pencil, Clock, CheckCircle, Kanban, Star } from "@phosphor-icons/react";
import userApiClient from "../../api/userApiClient";
import { useToast } from "../../hooks/useToast";

export const Profile = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const showToast = useToast();
  const user = useAppSelector((s) => s.login.user);
  const boards = useAppSelector((s) => s.board.boards);
  const allTasks = useAppSelector((s) => s.task.task);

  const favorites = useAppSelector((s) => s.task.favorites);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getTasks());
    dispatch(fetchBoard());
    dispatch(getFavoriteTasks());
}, [dispatch]);

  const myTasks = useMemo(
    () => allTasks.filter((t) => t.assignedTo?.some((u: any) => u.id === user?.id)),
    [allTasks, user?.id]
  );

  const stats = useMemo(() => {
    const myBoards = boards.filter((b) => b.members.some((m) => m.id === user?.id));
    const completed = myTasks.filter((t) => t.progress === 100).length;
    const inProgress = myTasks.length - completed;
    const totalMs = myTasks.reduce((sum, t) => {
      const mine = t.timeManagement?.byUser?.find((e: any) => e.user.id === user?.id);
      return sum + (mine?.duration || 0);
    }, 0);
    return {
      projectCount: myBoards.length,
      taskCount: myTasks.length,
      completed,
      inProgress,
      totalHours: (totalMs / 3600000).toFixed(1),
    };
  }, [boards, myTasks, user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApiClient.put(`/api/users/edit/${user?.id}`, { full_name: fullName });
      showToast("Profile updated");
      setEditing(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const total = stats.completed + stats.inProgress;
  const completedPct = total > 0 ? Math.round((stats.completed / total) * 100) : 0;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: profile card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: getAvatarColor(user?.full_name || "User") }}
                >
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  {editing ? (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xl font-bold border-b border-gray-300 outline-none"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
                  )}
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {user?.role}
                  </span>
                </div>
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-bold bg-black text-white rounded-lg">
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setEditing(false); setFullName(user?.full_name || ""); }} className="px-3 py-1.5 text-xs font-bold border rounded-lg">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <Pencil size={18} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3 mt-8">
              <StatBox icon={<Kanban size={16} />} label="Projects" value={stats.projectCount} color="text-blue-600 bg-blue-50" />
              <StatBox icon={<CheckCircle size={16} />} label="Completed" value={stats.completed} color="text-emerald-600 bg-emerald-50" />
              <StatBox icon={<Clock size={16} />} label="In Progress" value={stats.inProgress} color="text-amber-600 bg-amber-50" />
              <StatBox icon={<Clock size={16} />} label="Hours Logged" value={`${stats.totalHours}h`} color="text-indigo-600 bg-indigo-50" />
            </div>
          </div>

          {/* FAVORITES */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Star size={16} weight="fill" className="text-yellow-400" /> Favorite Tasks
            </h3>
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No favorites yet — star a task to pin it here.</p>
            ) : (
              <div className="space-y-2">
                {favorites.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/${user?.role}/dashboard/tasks/${t.id}`)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center justify-between border border-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-800">{t.title}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.priority}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: small chart, bottom corner as requested */}
        <div className="flex flex-col justify-end">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Completion Rate</h4>
            <div className="relative w-28 h-28 mx-auto">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10"
                  strokeDasharray={`${(completedPct / 100) * 263.9} 263.9`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-gray-800">{completedPct}%</span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">{stats.completed} of {total} tasks done</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="mb-1">{icon}</div>
    <p className="text-lg font-black">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-tight opacity-70">{label}</p>
  </div>
);