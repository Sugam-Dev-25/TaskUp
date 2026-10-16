import {
  FileIcon, FilePdfIcon, FileDocIcon, FileXlsIcon, FilePptIcon, FileZipIcon, FileTextIcon, FileVideoIcon,
} from "@phosphor-icons/react";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 5;
export const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,video/mp4";

export const formatBytes = (bytes?: number | null) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function validateFiles(files: File[], alreadyAttached = 0) {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) errors.push(`${f.name} is larger than 25 MB`);
    else if (alreadyAttached + valid.length >= MAX_FILES) {
      errors.push(`You can attach up to ${MAX_FILES} files at a time`);
      break;
    } else valid.push(f);
  }
  return { valid, errors };
}

export const FileTypeIcon = ({ type, name = "", size = 22 }: { type?: string | null; name?: string; size?: number }) => {
  const t = (type || "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (t === "application/pdf" || ext === "pdf") return <FilePdfIcon size={size} className="text-red-500" />;
  if (t.includes("word") || ["doc", "docx"].includes(ext)) return <FileDocIcon size={size} className="text-blue-500" />;
  if (t.includes("excel") || t.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(ext))
    return <FileXlsIcon size={size} className="text-emerald-600" />;
  if (t.includes("powerpoint") || t.includes("presentation") || ["ppt", "pptx"].includes(ext))
    return <FilePptIcon size={size} className="text-orange-500" />;
  if (t.includes("zip") || ext === "zip") return <FileZipIcon size={size} className="text-amber-600" />;
  if (t.startsWith("video/")) return <FileVideoIcon size={size} className="text-purple-500" />;
  if (t.startsWith("text/")) return <FileTextIcon size={size} className="text-gray-500" />;
  return <FileIcon size={size} className="text-gray-400" />;
};