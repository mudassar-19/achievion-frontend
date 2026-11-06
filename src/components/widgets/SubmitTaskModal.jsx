import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Paperclip, Link2, Plus, Trash2, Loader2,
  FileText, GitBranch, Layers, Globe, HardDrive, TestTube, ChevronDown,
} from "lucide-react";
import useTaskStore from "@/stores/taskStore";
import useUiStore   from "@/stores/uiStore";
import useAuthStore from "@/stores/authStore";
import usePerfLog   from "@/hooks/usePerfLog";

// ── Link type config ──────────────────────────────────────────────────────────
const LINK_TYPES = [
  { value: "github",   label: "GitHub",        Icon: GitBranch  },
  { value: "figma",    label: "Figma",         Icon: Layers  },
  { value: "drive",    label: "Google Drive",  Icon: HardDrive },
  { value: "url",      label: "Live URL",      Icon: Globe   },
  { value: "report",   label: "Test Report",   Icon: TestTube },
  { value: "other",    label: "Other",         Icon: Link2   },
];

const LINK_PLACEHOLDER = {
  github:  "https://github.com/…/pull/…",
  figma:   "https://www.figma.com/file/…",
  drive:   "https://drive.google.com/…",
  url:     "https://…",
  report:  "https://…",
  other:   "https://…",
};

// What the AI reads (D-060..062, server/services/aiEvalRules.js). Files are never sent to the AI.
const AI_LIMIT = { lines: 300, bytes: 12 * 1024 };
const TEXT_FILE = /\.(js|jsx|ts|tsx|mjs|cjs|py|java|kt|cs|go|rb|php|c|h|cpp|hpp|rs|swift|css|scss|html|sql|sh|json|yml|yaml|txt|md|csv)$/i;
const DESIGN_CHECKLIST = [
  ["brief", "Matches the task brief"], ["hierarchy", "Clear visual hierarchy"], ["consistency", "Consistent spacing, colour and type"],
  ["contrast", "Text contrast and size checked"], ["states", "All screens and states included"],
];

function AiSection({ roleCategory, content, setContent, checklist, setChecklist, addToast }) {
  const fileRef = useRef(null);
  if (!["developer", "designer", "tester"].includes(roleCategory)) return null;
  const lines = content ? content.split("\n").length : 0;
  const kb = new Blob([content]).size / 1024;
  const over = roleCategory === "developer" ? lines > AI_LIMIT.lines || kb > 12 : kb > 12;

  function loadFile(f) {
    if (!f) return;
    if (!TEXT_FILE.test(f.name)) { addToast({ type: "error", message: "Pick a text or code file (for example .js, .py, .txt, .csv)." }); return; }
    if (f.size > 100_000) { addToast({ type: "error", message: "That file is over 100 KB. Paste the main part instead." }); return; }
    f.text().then(setContent);
  }

  return (
    <section aria-labelledby="ai-sec" className="flex flex-col gap-2 rounded-2xl border border-border-subtle p-4">
      <h3 id="ai-sec" className="text-sm font-bold text-text-primary">
        {roleCategory === "developer" ? "Code for AI feedback" : roleCategory === "tester" ? "Bug report or test cases" : "Design checklist"}
        <span className="ml-1.5 font-normal text-text-tertiary">(optional)</span>
      </h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        {roleCategory === "designer"
          ? "AI reads your notes and this checklist, not the image. Your Team Lead judges the design itself."
          : `AI gives your Team Lead feedback on this text. Your Team Lead gives the final score. Limit: ${roleCategory === "developer" ? "300 lines / 12 KB" : "12 KB"}.`}
      </p>
      {roleCategory === "designer" ? (
        <div className="flex flex-col gap-1.5 mt-1">
          {DESIGN_CHECKLIST.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[#1948BD]" checked={checklist.includes(key)}
                onChange={(e) => setChecklist((c) => (e.target.checked ? [...c, key] : c.filter((k) => k !== key)))} />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} spellCheck={false}
            aria-label={roleCategory === "developer" ? "Code for AI feedback" : "Bug report or test cases"}
            placeholder={roleCategory === "developer" ? "Paste one file or the main part of your change" : "Steps, expected result, actual result, severity…"}
            className={`w-full rounded-xl border border-border-subtle bg-ink/[0.03] px-3 py-2.5 text-xs text-text-primary outline-none focus:border-[#1948BD]/50 ${roleCategory === "developer" ? "font-mono" : ""}`}
            style={{ resize: "vertical" }} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-[#1948BD] hover:underline">
              Load from a file
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />
            <span className={`tabular-nums ${over ? "text-[#7A5200] font-semibold" : "text-text-tertiary"}`}>
              {roleCategory === "developer" ? `${lines} lines · ` : ""}{kb.toFixed(1)} KB
            </span>
          </div>
          {over && (
            <p className="text-xs text-[#7A5200] leading-relaxed">
              {roleCategory === "developer"
                ? "Over the limit: AI will read an outline and the first 300 lines, and mark it \"Partial review\"."
                : "Over 12 KB: AI will read the first 12 KB and mark it \"Partial review\"."}
            </p>
          )}
        </>
      )}
    </section>
  );
}

const MAX_FILES       = 5;
const MAX_FILE_MB     = 10;
const MAX_FILE_BYTES  = MAX_FILE_MB * 1024 * 1024;

function LinkRow({ entry, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const cfg = LINK_TYPES.find((t) => t.value === entry.type) ?? LINK_TYPES[5];

  return (
    <div className="flex items-center gap-2">
      {/* Type selector */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-semibold transition-colors"
          style={{ background: "rgba(20,32,61,0.04)", borderColor: "rgba(20,32,61,0.10)", color: "#3A4660" }}
        >
          <cfg.Icon size={12} strokeWidth={2} />
          {cfg.label}
          <ChevronDown size={10} strokeWidth={2} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute left-0 top-full mt-1 z-30 rounded-xl border shadow-xl min-w-[150px] overflow-hidden"
              style={{ background: "#FFFFFF", borderColor: "rgba(20,32,61,0.12)" }}
            >
              {LINK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { onChange({ ...entry, type: t.value }); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-text-primary hover:bg-ink/[0.06] transition-colors"
                >
                  <t.Icon size={11} strokeWidth={2} /> {t.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* URL input */}
      <input
        type="url"
        value={entry.url}
        onChange={(e) => onChange({ ...entry, url: e.target.value })}
        placeholder={LINK_PLACEHOLDER[entry.type]}
        className="flex-1 h-9 bg-ink/[0.04] border border-ink/10 rounded-lg px-3 text-xs text-text-primary placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
      />

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── SubmitTaskModal ───────────────────────────────────────────────────────────
const ALLOWED_TYPES_LABEL = "JPG, PNG, PDF, ZIP, DOCX, XLSX";

export default function SubmitTaskModal({ task, onClose, onSubmitted }) {
  const { submitTask }  = useTaskStore();
  const addToast        = useUiStore((s) => s.addToast);
  const { log }         = usePerfLog();
  const fileInputRef    = useRef(null);

  const roleCategory = useAuthStore((s) => s.user?.roleCategory);
  const [content,    setContent]    = useState("");
  const [checklist,  setChecklist]  = useState([]);
  const [note,       setNote]       = useState("");
  const [summary,    setSummary]    = useState("");
  const [links,      setLinks]      = useState([]);
  const [files,      setFiles]      = useState([]);
  const [busy,       setBusy]       = useState(false);
  const [errors,     setErrors]     = useState({});

  // ── Link helpers ─────────────────────────────────────────────────────────
  const addLink   = () => setLinks((l) => [...l, { type: "github", url: "" }]);
  const updateLink = (i, val) => setLinks((l) => l.map((x, j) => j === i ? val : x));
  const removeLink = (i)      => setLinks((l) => l.filter((_, j) => j !== i));

  // ── File helpers ─────────────────────────────────────────────────────────
  // FE-R017: tell people what the server accepts instead of failing with a raw 500 after upload.
  // (.txt and .md are on the server list but were rejected by the storage provider in testing.)
  function handleFiles(raw) {
    const picked = Array.from(raw || []);
    const bad = picked.filter((f) => !/\.(jpe?g|png|pdf|zip|docx|xlsx)$/i.test(f.name));
    if (bad.length) {
      addToast({ type: "error", message: `Not allowed: ${bad.map((f) => f.name).join(", ")}. Allowed types: ${ALLOWED_TYPES_LABEL}.` });
      return;
    }
    const oversized = picked.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length) {
      addToast({ type: "error", message: `Files must be under ${MAX_FILE_MB}MB each.` });
      return;
    }
    setFiles((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > MAX_FILES) {
        addToast({ type: "error", message: `Maximum ${MAX_FILES} files allowed.` });
        return prev;
      }
      return combined;
    });
  }
  const removeFile = (i) => setFiles((f) => f.filter((_, j) => j !== i));

  // ── Validation ───────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!note.trim()) e.note = "Submission notes are required.";
    const badLinks = links.filter((l) => l.url.trim() && !/^https?:\/\//i.test(l.url.trim()));
    if (badLinks.length) e.links = "All links must start with http:// or https://";
    return e;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("note",    note.trim());
      fd.append("summary", summary.trim());
      // Only attach links that have a URL filled in
      const validLinks = links.filter((l) => l.url.trim());
      fd.append("links", JSON.stringify(validLinks));
      files.forEach((f) => fd.append("files", f));
      if (content.trim()) fd.append("content", content);
      if (checklist.length) fd.append("checklist", JSON.stringify(checklist));

      const t0 = performance.now();
      await submitTask(task._id, fd);
      log("submit_task", performance.now() - t0, "/workspace/sprint");
      addToast({ type: "success", message: "Work submitted for review!" });
      onSubmitted?.();
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Submission failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-[620px] max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col"
        style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 100%)", borderColor: "rgba(79,70,229,0.30)" }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "linear-gradient(180deg, #FFFFFF, #FFFFFF)", borderColor: "rgba(79,70,229,0.15)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.30)" }}>
              <Send size={14} strokeWidth={2} style={{ color: "#131E86" }} />
            </span>
            <div>
              <h2 className="text-sm font-black text-text-primary">Submit For Review</h2>
              <p className="text-[14px] text-slate-500 truncate max-w-[320px]">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700 transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Submission Notes (required) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
              Submission Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); if (errors.note) setErrors((e2) => ({ ...e2, note: null })); }}
              placeholder="Describe what you've completed, what changed, and any blockers you encountered…"
              rows={4}
              className="w-full bg-ink/[0.04] border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-slate-600 outline-none transition-colors"
              style={{
                borderColor: errors.note ? "rgba(209,41,31,0.6)" : "rgba(20,32,61,0.08)",
                resize: "vertical",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,70,229,0.6)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = errors.note ? "rgba(209,41,31,0.6)" : "rgba(20,32,61,0.08)")}
            />
            {errors.note && <p className="text-[14px] text-red-400">{errors.note}</p>}
          </div>

          {/* Work Summary (optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
              Work Summary <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief technical summary of the approach, implementation decisions, or testing done…"
              rows={3}
              className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-slate-600 outline-none focus:border-indigo-500/40 transition-colors"
              style={{ resize: "vertical" }}
            />
          </div>

          <AiSection roleCategory={roleCategory} content={content} setContent={setContent}
            checklist={checklist} setChecklist={setChecklist} addToast={addToast} />

          {/* Links */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
                Links & URLs <span className="text-slate-600">(optional)</span>
              </label>
              {links.length < 8 && (
                <button
                  type="button"
                  onClick={addLink}
                  className="flex items-center gap-1 text-[14px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={11} strokeWidth={2.5} /> Add Link
                </button>
              )}
            </div>

            {links.length === 0 ? (
              <button
                type="button"
                onClick={addLink}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 py-2 rounded-xl border border-dashed border-ink/[0.08] px-4 transition-colors hover:border-ink/20"
              >
                <Link2 size={13} strokeWidth={1.75} />
                Add GitHub, Figma, Drive, or any relevant URL…
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {links.map((l, i) => (
                  <LinkRow
                    key={i}
                    entry={l}
                    onChange={(v) => updateLink(i, v)}
                    onRemove={() => removeLink(i)}
                  />
                ))}
              </div>
            )}
            {errors.links && <p className="text-[14px] text-red-400">{errors.links}</p>}
          </div>

          {/* File Attachments */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
                File Attachments <span className="text-slate-600">(up to {MAX_FILES} files, {MAX_FILE_MB}MB each)</span>
              </label>
              {files.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[14px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={11} strokeWidth={2.5} /> Attach File
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.zip,.docx,.xlsx"
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />

            {files.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 py-2 rounded-xl border border-dashed border-ink/[0.08] px-4 transition-colors hover:border-ink/20"
              >
                <Paperclip size={13} strokeWidth={1.75} />
                Allowed: {ALLOWED_TYPES_LABEL}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
                    style={{ background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }}
                  >
                    <FileText size={12} className="text-slate-500 shrink-0" strokeWidth={2} />
                    <span className="text-xs text-slate-300 flex-1 truncate">{f.name}</span>
                    <span className="text-[14px] text-slate-600 shrink-0">
                      {(f.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[14px] text-indigo-400 hover:text-indigo-300 text-left pl-1 transition-colors"
                  >
                    + Add more ({MAX_FILES - files.length} remaining)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Info banner */}
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[14px] text-slate-500"
            style={{ background: "rgba(79,70,229,0.07)", border: "1px solid rgba(79,70,229,0.15)" }}
          >
            <Send size={11} className="mt-0.5 shrink-0 text-indigo-500" strokeWidth={2} />
            <span>
              After submitting, this task will move to <strong className="text-indigo-400">In Review</strong>.
              Your Team Lead will be notified and can approve or request revisions.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-ink/10 hover:border-ink/20 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !note.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all"
              style={{
                background: busy || !note.trim() ? "rgba(79,70,229,0.4)" : "#1948BD",
                color: "#fff",
                opacity: busy || !note.trim() ? 0.6 : 1,
              }}
            >
              {busy
                ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                : <><Send size={14} strokeWidth={2.5} /> Submit For Review</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
