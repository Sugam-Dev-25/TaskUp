import { useRef, useState } from "react";
import { CloudArrowUpIcon, PaperclipIcon, TrashIcon, DownloadSimpleIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { Attachment } from "../../types/board.Types";
import { useAppDispatch, useAppSelector } from "../../redux/app/hook";
import { deleteFiles, uploadFiles } from "../../redux/features/Attachment/attachmentThunks";
import { useToast } from "../../hooks/useToast";
import { ACCEPT, FileTypeIcon, MAX_FILES, formatBytes, validateFiles } from "../../utils/fileHelper";

interface Props {
  taskId: string;
  attachments: Attachment[];
}

export const AttachmentSection = ({ taskId, attachments }: Props) => {
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const me = useAppSelector((s) => s.login.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const isManager = me?.role === "manager" || me?.role === "ceo";
  const uploading = progress !== null;

  const handleFiles = async (picked: File[]) => {
    if (picked.length === 0 || uploading) return;
    const { valid, errors } = validateFiles(picked);
    errors.forEach((m) => showToast(m, "error"));
    if (valid.length === 0) return;

    const formData = new FormData();
    valid.forEach((f) => formData.append("files", f));
    setProgress(0);
    try {
      await dispatch(uploadFiles({ taskId, formData, onProgress: setProgress })).unwrap();
      showToast(`${valid.length} file${valid.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      showToast(typeof err === "string" ? err : "Upload failed", "error");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (a: Attachment) => {
    if (!window.confirm(`Delete "${a.fileName}"? This can't be undone.`)) return;
    try {
      await dispatch(deleteFiles({ taskId, fileId: a.id })).unwrap();
      showToast("File deleted");
    } catch (err) {
      showToast(typeof err === "string" ? err : "Delete failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <PaperclipIcon size={18} weight="bold" /> Attachments
        </h3>
        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {attachments.length} {attachments.length === 1 ? "File" : "Files"}
        </span>
      </div>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer
          ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30"}`}
      >
        <input ref={inputRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
        <CloudArrowUpIcon size={26} className="text-blue-500 mb-2" />
        {uploading ? (
          <div className="w-full max-w-xs">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-gray-500 text-center mt-2">
              {progress! < 100 ? `Uploading ${progress}%` : "Processing…"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium">
              Drop files or <span className="text-blue-500 font-bold underline">browse</span>
            </p>
            <p className="text-[10px] text-gray-300 mt-1">Up to {MAX_FILES} files, 25 MB each</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        {attachments.map((a) => {
          const canDelete = isManager || a.uploadedBy?.id === me?.id;
          return (
            <div key={a.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all">
              <a href={a.fileUrl} target="_blank" rel="noreferrer"
                className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                {a.isImage ? (
                  <img src={a.previewUrl ?? a.fileUrl} alt={a.fileName} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <FileTypeIcon type={a.fileType} name={a.fileName} />
                )}
              </a>
              <div className="flex-grow min-w-0">
                <p className="text-xs font-bold text-gray-700 truncate">{a.fileName}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {[formatBytes(a.size), a.uploadedBy?.full_name ?? "Unknown",
                    a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a href={a.fileUrl} target="_blank" rel="noreferrer" title="Open" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                  <ArrowSquareOutIcon size={16} weight="bold" />
                </a>
                <a href={a.downloadUrl} title="Download" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md">
                  <DownloadSimpleIcon size={16} weight="bold" />
                </a>
                {canDelete && (
                  <button onClick={() => handleDelete(a)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                    <TrashIcon size={16} weight="bold" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};