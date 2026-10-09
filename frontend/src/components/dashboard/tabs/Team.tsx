// components/dashboard/tabs/Teams.tsx
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import userApiClient from "../../api/userApiClient";
import { getAvatarColor } from "../../utils/avatarColor";
import { fetchBoard } from "../../redux/features/Board/boardSlice";
import { getTasks } from "../../redux/features/Task/taskSlice";
import type { User } from "../../types/user.Types";
import { useToast } from "../../hooks/useToast";

const ROLE_ORDER: Record<string, number> = { ceo: 0, manager: 1, hr: 2, employee: 3 };

export const Teams = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.login.user);
  const boards = useAppSelector((s) => s.board.boards);
  const tasks = useAppSelector((s) => s.task.task);
  const showToast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = currentUser?.role === "manager" || currentUser?.role === "ceo";

  useEffect(() => {
    userApiClient.get("/api/users").then((res) => setUsers(res.data)).catch(() => showToast("Failed to load team", "error")).finally(() => setLoading(false));
    dispatch(fetchBoard());
    dispatch(getTasks());
  }, [dispatch]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.full_name.localeCompare(b.full_name)),
    [users]
  );

  const statsFor = (userId: string) => ({
    boardCount: boards.filter((b) => b.members.some((m) => m.id === userId)).length,
    taskCount: tasks.filter((t) => t.assignedTo.some((u: any) => u.id === userId)).length,
  });

  if (loading) return <div className="p-10 text-center text-gray-400">Loading team...</div>;

  return (
    <div className="flex h-full">
      {/* LEFT: table, shrinks when a user is selected */}
      <div className={`transition-all duration-300 ${selected ? "w-[55%]" : "w-full"} p-6 overflow-y-auto`}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Team</h1>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black">
                <th className="px-6 py-4 text-xs font-semibold text-gray-50 tracking-widest">Member</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-50 tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-50 tracking-widest">Boards</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-50 tracking-widest">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedUsers.map((u) => {
                const stats = statsFor(u.id);
                return (
                  <tr key={u.id} onClick={() => setSelected(u)}
                    className={`cursor-pointer transition-colors ${selected?.id === u.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: getAvatarColor(u.full_name) }}>
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">{stats.boardCount}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">{stats.taskCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: detail panel */}
      {selected && (
        <div className="w-[45%] border-l border-gray-100 p-6 overflow-y-auto bg-gray-50/40">
          <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-black mb-4">✕ Close</button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl text-white"
                style={{ backgroundColor: getAvatarColor(selected.full_name) }}>
                {selected.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.full_name}</h2>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{selected.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-2xl font-black text-blue-600">{statsFor(selected.id).boardCount}</p>
                <p className="text-xs text-blue-500 font-semibold uppercase">Boards</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-2xl font-black text-emerald-600">{statsFor(selected.id).taskCount}</p>
                <p className="text-xs text-emerald-500 font-semibold uppercase">Tasks Assigned</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Member since {new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            {canManage && (
              <button className="w-full py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900">
                Manage Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};