const MENTION_RE = /@\[([^\]]{1,100})\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;
const MAX_COMMENT_CHARS = 5000;
const bad = (message) => Object.assign(new Error(message), { status: 400 });

function parseBlocks(raw) {
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

/** Validates the composer's ordered blocks. File blocks refer to the uploaded files by index. */
function buildCommentBlocks(body, fileCount) {
  let raw;
  if (body.blocks !== undefined) {
    try { raw = JSON.parse(body.blocks); } catch { throw bad('Invalid comment content'); }
    if (!Array.isArray(raw) || raw.length > 50) throw bad('Invalid comment content');
  } else {
    raw = [];
    if (body.text) raw.push({ type: 'text', text: String(body.text) });
    for (let i = 0; i < fileCount; i++) raw.push({ type: 'file', index: i });
  }
  const out = [];
  const used = new Set();
  let chars = 0;
  for (const b of raw) {
    if (b?.type === 'text' && typeof b.text === 'string') {
      const text = b.text.trim();
      if (!text) continue;
      chars += text.length;
      if (chars > MAX_COMMENT_CHARS) throw bad(`Comment is too long (max ${MAX_COMMENT_CHARS} characters)`);
      out.push({ type: 'text', text });
    } else if (b?.type === 'file' && Number.isInteger(b.index) && b.index >= 0 && b.index < fileCount && !used.has(b.index)) {
      used.add(b.index);
      out.push({ type: 'file', index: b.index });
    }
  }
  for (let i = 0; i < fileCount; i++) if (!used.has(i)) out.push({ type: 'file', index: i });
  return out;
}

function plainText(blocks) {
  return blocks.filter((b) => b.type === 'text').map((b) => b.text.replace(MENTION_RE, '@$1')).join('\n');
}
function mentionIdsFrom(blocks) {
  return [...new Set(blocks.filter((b) => b.type === 'text').flatMap((b) => [...b.text.matchAll(MENTION_RE)].map((m) => m[2])))];
}

/** Edited comment: file blocks may only reference this comment's own files; omitted files are removed. */
function validateEditedBlocks(input, existingAttachments) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) throw bad('Invalid comment content');
  const own = new Set(existingAttachments.map((a) => a.id));
  const kept = new Set();
  const out = [];
  let chars = 0;
  for (const b of input) {
    if (b?.type === 'text' && typeof b.text === 'string') {
      const text = b.text.trim();
      if (!text) continue;
      chars += text.length;
      if (chars > MAX_COMMENT_CHARS) throw bad(`Comment is too long (max ${MAX_COMMENT_CHARS} characters)`);
      out.push({ type: 'text', text });
    } else if (b?.type === 'file' && own.has(b.attachment_id) && !kept.has(b.attachment_id)) {
      kept.add(b.attachment_id);
      out.push({ type: 'file', attachment_id: b.attachment_id });
    }
  }
  if (out.length === 0) throw bad('A comment cannot be empty. Delete it instead.');
  return { blocks: out, removedIds: existingAttachments.map((a) => a.id).filter((id) => !kept.has(id)) };
}

module.exports = { parseBlocks, buildCommentBlocks, plainText, mentionIdsFrom, validateEditedBlocks };