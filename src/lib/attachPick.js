// Picking attachments (item 49): new files are appended to the ones already chosen, at most 5, each at most 5 MB,
// PDF / DOC / DOCX / CSV / PNG / JPG only (same limits as the server). Pure: returns the new list and one message per refused file.
export const MAX_FILES = 5;
export const MAX_BYTES = 5 * 1024 * 1024;
export const ACCEPT = ".pdf,.doc,.docx,.csv,.png,.jpg,.jpeg";
const EXTS = ACCEPT.split(",");

export function addPicked(current, incoming, max = MAX_FILES) {
  const files = [...current], errors = [];
  for (const f of incoming) {
    const ext = /\.[^.]+$/.exec(f.name.toLowerCase())?.[0];
    if (!EXTS.includes(ext)) errors.push(`${f.name}: this type is not allowed. Use PDF, DOC, DOCX, CSV, PNG or JPG.`);
    else if (f.size > MAX_BYTES) errors.push(`${f.name}: each file can be at most 5 MB.`);
    else if (files.some((x) => x.name === f.name && x.size === f.size)) continue; // same file picked twice
    else if (files.length >= max) errors.push(`${f.name}: at most ${max} files. Remove one first.`);
    else files.push(f);
  }
  return { files, errors };
}
