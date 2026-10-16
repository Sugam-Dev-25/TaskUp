import { useEffect, useMemo, useRef, useState } from "react";
import { PaperclipIcon, PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import type { User } from "../../types/user.Types";
import { useAppDispatch } from "../../redux/app/hook";
import { addComment } from "../../redux/features/Comment/commentThunks";
import { useToast } from "../../hooks/useToast";
import { getAvatarColor } from "../../utils/avatarColor";
import { ACCEPT, FileTypeIcon, formatBytes, validateFiles } from "../../utils/fileHelper";

export const Avatar = ({ name, size = 32 }: { name?: string | null; size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: getAvatarColor(name || "?") }}
  >
    {(name || "?").trim().charAt(0).toUpperCase()}
  </div>
);

type Draft =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "file"; file: File; previewUrl: string | null };

const uid = () => Math.random().toString(36).slice(2, 10);
const newText = (text = ""): Draft => ({ id: uid(), kind: "text", text });

/** Merge neighbouring text blocks and always keep a text block at the end to type into. */
function normalize(list: Draft[]): Draft[] {
  const out: Draft[] = [];
  for (const b of list) {
    const prev = out[out.length - 1];
    if (b.kind === "text" && prev?.kind === "text") {
      out[out.length - 1] = { ...prev, text: prev.text && b.text ? `${prev.text}\n${b.text}` : prev.text + b.text };
    } else out.push(b);
  }
  if (out.length === 0 || out[out.length - 1].kind === "file") out.push(newText());
  return out;
}

const revoke = (list: Draft[]) =>
  list.forEach((b) => b.kind === "file" && b.previewUrl && URL.revokeObjectURL(b.previewUrl));

const grow = (el: HTMLTextAreaElement) => {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

interface Props {
  taskId: string;
  members: User[];
  currentUserId?: string;
}

export const CommentComposer = ({ taskId, members, currentUserId }: Props) => {
  const dispatch = useAppDispatch();
  const showToast = useToast();

  const [blocks, setBlocks] = useState<Draft[]>(() => [newText()]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mention, setMention] = useState<{ blockId: string; start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const mentionMap = useRef<Record<string, string>>({}); // "Full Name" -> user id
  const focusNext = useRef<string | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  useEffect(() => () => revoke(blocksRef.current), []); // free preview URLs on unmount

  useEffect(() => {
    if (!focusNext.current) return;
    const el = refs.current[focusNext.current];
    focusNext.current = null;
    if (el) { el.focus(); el.setSelectionRange(0, 0); }
  }, [blocks]);

  const fileCount = blocks.filter((b) => b.kind === "file").length;
  const hasText = blocks.some((b) => b.kind === "text" && b.text.trim());
  const canSend = (hasText || fileCount > 0) && !sending;

  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();
    return members
      .filter((u) => u.full_name && u.id !== currentUserId)
      .filter((u) => u.full_name.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [mention, members, currentUserId]);

  const onTextChange = (id: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setBlocks((prev) => prev.map((b) => (b.id === id && b.kind === "text" ? { ...b, text: el.value } : b)));
    grow(el);
    const caret = el.selectionStart ?? el.value.length;
    const m = /(^|\s)@([^@\n]{0,24})$/.exec(el.value.slice(0, caret));
    if (m) { setMention({ blockId: id, start: caret - m[2].length - 1, query: m[2] }); setMentionIndex(0); }
    else setMention(null);
  };

  const pickMention = (u: User) => {
    if (!mention) return;
    const block = blocks.find((b) => b.id === mention.blockId);
    if (!block || block.kind !== "text") return;
    const el = refs.current[block.id];
    const caret = el?.selectionStart ?? block.text.length;
    const label = `@${u.full_name} `;
    const text = block.text.slice(0, mention.start) + label + block.text.slice(caret);
    mentionMap.current[u.full_name] = u.id;
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, text } : b)));
    setMention(null);
    const pos = mention.start + label.length;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos); });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && matches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickMention(matches[mentionIndex]); return; }
      if (e.key === "Escape") { setMention(null); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  };

  /** Drops the files at the caret, splitting the surrounding text into "before" and "after". */
  const insertFiles = (picked: File[]) => {
    const { valid, errors } = validateFiles(picked, fileCount);
    errors.forEach((m) => showToast(m, "error"));
    if (valid.length === 0) return;

    let idx = blocks.findIndex((b) => b.id === activeId && b.kind === "text");
    if (idx === -1) idx = blocks.length - 1;
    const target = blocks[idx];
    if (target.kind !== "text") return;

    const caret = refs.current[target.id]?.selectionStart ?? target.text.length;
    const fileBlocks: Draft[] = valid.map((f) => ({
      id: uid(),
      kind: "file",
      file: f,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    const after = newText(target.text.slice(caret));
    focusNext.current = after.id;
    setBlocks([
      ...blocks.slice(0, idx),
      { ...target, text: target.text.slice(0, caret) },
      ...fileBlocks,
      after,
      ...blocks.slice(idx + 1),
    ]);
  };

  const removeFile = (id: string) => {
    const target = blocks.find((b) => b.id === id);
    if (target?.kind === "file" && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
    setBlocks(normalize(blocks.filter((b) => b.id !== id)));
  };

  /** "@Full Name" -> "@[Full Name](user-id)", only for names picked from the list. */
  const tokenize = (text: string) => {
    let out = text;
    const names = Object.keys(mentionMap.current).sort((a, b) => b.length - a.length);
    for (const name of names) out = out.split(`@${name}`).join(`@[${name}](${mentionMap.current[name]})`);
    return out;
  };

  const handleSend = async () => {
    if (!canSend) return;
    const files: File[] = [];
    const payload: Array<{ type: "text"; text: string } | { type: "file"; index: number }> = [];
    for (const b of blocks) {
      if (b.kind === "text") {
        const t = tokenize(b.text).trim();
        if (t) payload.push({ type: "text", text: t });
      } else {
        payload.push({ type: "file", index: files.length });
        files.push(b.file);
      }
    }
    const form = new FormData();
    form.append("blocks", JSON.stringify(payload));
    files.forEach((f) => form.append("files", f));

    setSending(true);
    setProgress(files.length ? 0 : null);
    try {
      await dispatch(addComment({ taskId, formData: form, onProgress: setProgress })).unwrap();
      revoke(blocks);
      mentionMap.current = {};
      setBlocks([newText()]);
    } catch (err) {
      // the draft is kept so nothing the user typed is lost
      showToast(typeof err === "string" ? err : "Failed to post comment", "error");
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="relative border-t border-gray-100 bg-white p-3 shrink-0"
      onPaste={(e) => {
        const pasted = Array.from(e.clipboardData.files);
        if (pasted.length) { e.preventDefault(); insertFiles(pasted); } // paste a screenshot straight in
      }}
    >
      {mention && matches.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
          {matches.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pickMention(u); }} // keeps focus in the textarea
              className={`w-full flex items-center gap-2 px-3 py-2 text-left ${i === mentionIndex ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >
              <Avatar name={u.full_name} size={24} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{u.full_name}</p>
                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg focus-within:border-blue-400 transition-all p-1.5">
        <div className="max-h-[40vh] overflow-y-auto space-y-1">
          {blocks.map((b) =>
            b.kind === "text" ? (
              <textarea
                key={b.id}
                ref={(el) => { refs.current[b.id] = el; if (el) grow(el); }}
                value={b.text}
                rows={1}
                placeholder={blocks.length === 1 ? "Write a comment… type @ to mention" : ""}
                onFocus={() => setActiveId(b.id)}
                onChange={(e) => onTextChange(b.id, e)}
                onKeyDown={onKeyDown}
                className="w-full resize-none overflow-hidden text-sm text-gray-800 outline-none bg-transparent px-2 py-1.5 min-h-[34px]"
              />
            ) : (
              <div key={b.id} className="relative inline-block max-w-full align-top m-1">
                {b.previewUrl ? (
                  <img src={b.previewUrl} alt={b.file.name} className="max-h-40 max-w-full rounded-lg border border-gray-200" />
                ) : (
                  <div className="flex items-center gap-2 pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <FileTypeIcon type={b.file.type} name={b.file.name} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate max-w-[180px]">{b.file.name}</p>
                      <p className="text-[10px] text-gray-400">{formatBytes(b.file.size)}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(b.id)}
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow border border-gray-200 text-gray-500 hover:text-red-500 p-0.5"
                >
                  <XIcon size={12} weight="bold" />
                </button>
              </div>
            )
          )}
        </div>

        {progress !== null && (
          <div className="px-2 pb-1">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{progress < 100 ? `Uploading ${progress}%` : "Processing…"}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-1 pt-1.5 border-t border-gray-100">
          <div className="flex items-center gap-3 text-gray-400">
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              accept={ACCEPT}
              onChange={(e) => { insertFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
            />
            <button type="button" onClick={() => fileInput.current?.click()} className="hover:text-blue-500 transition-colors">
              <PaperclipIcon size={18} />
            </button>
            <span className="text-[10px] hidden sm:inline">Ctrl + Enter to send</span>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={canSend ? "text-blue-500 hover:scale-110 transition" : "text-gray-300"}
          >
            <PaperPlaneRightIcon size={20} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
};