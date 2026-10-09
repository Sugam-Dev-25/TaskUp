// components/SearchBar.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Kanban, ListChecks } from "@phosphor-icons/react";
import { useAppSelector } from "../redux/app/hook";
import { slugify } from "../hooks/slugify";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const boards = useAppSelector((s) => s.board.boards);
  const tasks = useAppSelector((s) => s.task.task);
  const user = useAppSelector((s) => s.login.user);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const showResults = q.length >= 2;

  const matchedBoards = showResults ? boards.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 5) : [];
  const matchedTasks = showResults ? tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5) : [];
  const hasResults = matchedBoards.length > 0 || matchedTasks.length > 0;

  const goToBoard = (boardName: string) => {
    navigate(`/${user?.role}/dashboard/${slugify(boardName)}`);
    setQuery("");
    setOpen(false);
  };

  const goToTask = (taskId: string) => {
    navigate(`/${user?.role}/dashboard/tasks/${taskId}`);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-3 w-[420px] max-w-full">
      <MagnifyingGlass size={18} className="text-gray-500 shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search project, tasks..."
        className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
      />

      {open && showResults && (
        <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {!hasResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No matches for "{query}"</div>
          )}
          {matchedBoards.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Boards</p>
              {matchedBoards.map((b) => (
                <button key={b.id} onClick={() => goToBoard(b.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <Kanban size={16} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-800 truncate">{b.name}</span>
                </button>
              ))}
            </div>
          )}
          {matchedTasks.length > 0 && (
            <div className="border-t border-gray-50">
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</p>
              {matchedTasks.map((t) => (
                <button key={t.id} onClick={() => goToTask(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <ListChecks size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-800 truncate">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};