import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Check, X, Plus, Paperclip,
  AlertTriangle, Info, Calendar, Zap, Users,
  FileText, Image, Trash2, Upload, BookOpen,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import { avatarUrl } from "@/lib/avatar";

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Web Application", "Mobile App", "API / Backend",
  "Design", "QA / Testing", "DevOps", "Data / Analytics", "Other",
];

const RISK_CONFIGS = {
  Low: {
    color: "#0E6A30",
    description: "Small scope, stable requirements, minimal dependencies.",
  },
  Medium: {
    color: "#7A5200",
    description: "Moderate complexity, some dependency risk, evolving requirements.",
  },
  High: {
    color: "#9A3A06",
    description: "Aggressive deadlines, uncertain requirements, heavy dependency chains.",
  },
  Critical: {
    color: "#B01F17",
    description: "High business impact, severe deadline pressure, unstable scope.",
  },
};

// Only canonical execution role categories — Senior/Junior variants are implicitly included
const ACTIVE_ROLES = ["Team Lead", "Developer", "Designer", "Tester"];

const STEP_LABELS = ["Identity", "Context", "Timeline", "Milestones", "Team & Tech"];
const STEP_ICONS  = [FileText, BookOpen, Calendar, Zap, Users];

// ── Draft helpers ──────────────────────────────────────────────────────────────
const DRAFT_KEY = "achievion_project_drafts";

function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]"); }
  catch { return []; }
}

function upsertDraft(draft) {
  const all = loadDrafts().filter((d) => d.id !== draft.id);
  localStorage.setItem(DRAFT_KEY, JSON.stringify([draft, ...all]));
}

function removeDraft(id) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(loadDrafts().filter((d) => d.id !== id)));
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcWorkingDays(start, end) {
  if (!start || !end) return 0;
  let count = 0;
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return 0;
  const curr = new Date(s);
  while (curr <= e) {
    const d = curr.getDay();
    if (d !== 0 && d !== 6) count++;
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

function fileIcon(type) {
  if (type?.includes("image")) return <Image size={14} className="text-blue-400" />;
  return <FileText size={14} className="text-orange-400" />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Rich Text Editor ───────────────────────────────────────────────────────────
function ToolBtn({ cmd, val, title, children, onExec }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onExec(cmd, val); }}
      title={title}
      className="px-2 py-1 rounded text-xs font-bold text-slate-400 hover:text-text-primary hover:bg-ink/[0.08] transition-colors"
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isInit    = useRef(false);

  useEffect(() => {
    if (!isInit.current && editorRef.current) {
      editorRef.current.innerHTML = value || "";
      isInit.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd, val) {
    document.execCommand(cmd, false, val ?? null);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      const node = sel?.anchorNode?.parentElement;
      if (node?.tagName === "LI") return;
      e.preventDefault();
      document.execCommand("insertLineBreak");
      onChange(editorRef.current?.innerHTML ?? "");
    }
  }

  return (
    <div
      className="rounded-xl border border-ink/[0.08] overflow-hidden"
      style={{ background: "rgba(20,32,61,0.03)" }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-ink/[0.06] flex-wrap">
        <ToolBtn cmd="formatBlock" val="H2" title="Heading 2" onExec={exec}>H2</ToolBtn>
        <ToolBtn cmd="formatBlock" val="H3" title="Heading 3" onExec={exec}>H3</ToolBtn>
        <div className="w-px h-4 bg-ink/[0.08] mx-1" />
        <ToolBtn cmd="bold"   title="Bold" onExec={exec}><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic" title="Italic" onExec={exec}><em>I</em></ToolBtn>
        <div className="w-px h-4 bg-ink/[0.08] mx-1" />
        <ToolBtn cmd="insertUnorderedList" title="Bullet list" onExec={exec}>• List</ToolBtn>
        <ToolBtn cmd="insertOrderedList"   title="Numbered list" onExec={exec}>1. List</ToolBtn>
        <div className="w-px h-4 bg-ink/[0.08] mx-1" />
        <ToolBtn cmd="removeFormat" title="Clear formatting" onExec={exec}>Clear</ToolBtn>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[200px] max-h-[360px] overflow-y-auto p-4 text-sm text-text-primary leading-relaxed focus:outline-none"
        style={{
          // Basic prose styles for the editor content
        }}
        data-placeholder="Describe the project goals, scope, and any relevant context. Paste requirements, module breakdowns, or meeting notes here..."
      />
      <style>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #4F5B75;
          pointer-events: none;
        }
        [contenteditable] h2 { font-size: 1.1rem; font-weight: 700; color: #14203D; margin: 0.5rem 0; }
        [contenteditable] h3 { font-size: 1rem; font-weight: 700; color: #14203D; margin: 0.4rem 0; }
        [contenteditable] strong { font-weight: 700; color: #14203D; }
        [contenteditable] em { font-style: italic; color: #3A4660; }
        [contenteditable] ul { list-style: disc; padding-left: 1.25rem; margin: 0.4rem 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.25rem; margin: 0.4rem 0; }
        [contenteditable] li { margin: 0.2rem 0; }
        [contenteditable] br { display: block; margin: 0.2rem 0; }
      `}</style>
    </div>
  );
}

// ── Attachment Dropzone ────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf", "text/csv",
  "image/png", "image/jpeg", "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTS = [".pdf", ".csv", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function AttachmentDropzone({ files, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [errors,   setErrors]   = useState([]);
  const inputRef = useRef(null);

  function validate(file) {
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext))
      return `${file.name}: unsupported type (PDF, DOC, DOCX, CSV, PNG, JPG allowed)`;
    if (file.size > MAX_FILE_SIZE)
      return `${file.name}: exceeds 5 MB limit`;
    return null;
  }

  function add(newFiles) {
    const errs = [];
    const valid = [];
    for (const f of newFiles) {
      const err = validate(f);
      if (err) errs.push(err);
      else valid.push(f);
    }
    setErrors(errs);
    if (valid.length) onChange([...files, ...valid]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    add(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200"
        style={{
          borderColor: dragging ? "#1F57E0" : "rgba(20,32,61,0.10)",
          background:  dragging ? "rgba(31,87,224,0.06)" : "rgba(20,32,61,0.02)",
        }}
      >
        <Upload size={22} className="text-slate-600" />
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Drop files here or <span className="text-blue-400 underline">browse</span>
          <br />
          <span className="text-slate-600">PDF, DOC, DOCX, CSV, PNG, JPG · max 5 MB each</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.csv,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => add(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* Errors */}
      {errors.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[14px] text-rose-400">
          <AlertTriangle size={11} /> {e}
        </div>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-ink/[0.06] bg-ink/[0.03]"
            >
              {fileIcon(f.type)}
              <span className="flex-1 text-xs text-slate-300 truncate">{f.name}</span>
              <span className="text-[14px] text-slate-600 shrink-0">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-slate-600 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step Dot ──────────────────────────────────────────────────────────────────
function StepDot({ index, current, label, icon: Icon, accent }) {
  const done   = index < current;
  const active = index === current;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border"
        style={{
          background:  done || active ? accent : "rgba(20,32,61,0.04)",
          borderColor: done || active ? accent : "rgba(20,32,61,0.10)",
          boxShadow:   active ? `0 0 20px ${accent}55` : "none",
        }}
      >
        {done
          ? <Check size={16} strokeWidth={2.5} style={{ color: "var(--on-accent)" }} />
          : <Icon size={16} strokeWidth={2} style={{ color: done || active ? "var(--on-accent)" : "#4F5B75" }} />
        }
      </div>
      <span
        className="text-[14px] font-bold uppercase tracking-widest"
        style={{ color: active ? accent : done ? "#3A4660" : "#4F5B75" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Milestone Card (Step 3) ────────────────────────────────────────────────────
function MilestoneCard({ ms, index, onChange, onRemove, projectStartDate, accent }) {
  const [delivInput, setDelivInput] = useState("");

  function addDeliverable(e) {
    if ((e.key === "Enter" || e.key === ",") && delivInput.trim()) {
      e.preventDefault();
      const val = delivInput.trim().replace(/,$/, "");
      if (val && !ms.deliverables.includes(val)) {
        onChange({ ...ms, deliverables: [...ms.deliverables, val] });
      }
      setDelivInput("");
    }
  }

  function toggleRole(role) {
    const next = ms.activeRoles.includes(role)
      ? ms.activeRoles.filter((r) => r !== role)
      : [...ms.activeRoles, role];
    onChange({ ...ms, activeRoles: next });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="rounded-2xl border border-ink/[0.08] overflow-hidden"
      style={{ background: "rgba(20,32,61,0.025)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ink/[0.06]">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[14px] font-black shrink-0"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
        >
          {index + 1}
        </div>
        <input
          value={ms.title}
          onChange={(e) => onChange({ ...ms, title: e.target.value })}
          placeholder={`Milestone ${index + 1} — e.g. Design & Wireframes`}
          className="flex-1 bg-transparent text-sm font-bold text-text-primary placeholder-slate-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Description */}
        <textarea
          value={ms.description}
          onChange={(e) => onChange({ ...ms, description: e.target.value })}
          rows={2}
          placeholder="What does this phase cover? Key objectives and outcomes..."
          className="w-full bg-ink/[0.03] border border-ink/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-ink/20 resize-none"
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={ms.startDate}
              min={projectStartDate || undefined}
              onChange={(e) => onChange({ ...ms, startDate: e.target.value })}
              className="w-full bg-ink/[0.03] border border-ink/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ink/20"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={ms.endDate}
              min={ms.startDate || projectStartDate || undefined}
              onChange={(e) => onChange({ ...ms, endDate: e.target.value })}
              className="w-full bg-ink/[0.03] border border-ink/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ink/20"
            />
          </div>
        </div>

        {/* Active Roles */}
        <div>
          <label className="block text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Active Roles in this Milestone</label>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVE_ROLES.map((r) => {
              const sel = ms.activeRoles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all duration-100"
                  style={{
                    background:  sel ? `${accent}18` : "rgba(20,32,61,0.03)",
                    borderColor: sel ? `${accent}45`  : "rgba(20,32,61,0.07)",
                    color:       sel ? accent          : "#4F5B75",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <label className="block text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Deliverables <span className="text-slate-600 font-normal normal-case">— press Enter to add</span>
          </label>
          <input
            value={delivInput}
            onChange={(e) => setDelivInput(e.target.value)}
            onKeyDown={addDeliverable}
            placeholder="e.g. Figma mockups, API spec, test report..."
            className="w-full bg-ink/[0.03] border border-ink/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20"
          />
          {ms.deliverables.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ms.deliverables.map((d, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-[14px] font-bold px-2.5 py-1 rounded-lg border"
                  style={{ color: "#3A4660", background: "rgba(20,32,61,0.04)", borderColor: "rgba(20,32,61,0.10)" }}
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => onChange({ ...ms, deliverables: ms.deliverables.filter((_, j) => j !== i) })}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X size={9} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Member Row (Step 4) ────────────────────────────────────────────────────────
function MemberRow({ member, selected, onToggle, accent }) {
  const open      = member.tasks?.inProgress ?? 0;
  const overloaded = member.availability === "Overloaded";

  let workloadColor = "#0E6A30";
  let workloadLabel = "Available";
  if (open > 4)       { workloadColor = "#B01F17"; workloadLabel = "Heavy";    }
  else if (open > 2)  { workloadColor = "#7A5200"; workloadLabel = "Moderate"; }
  else if (open > 0)  { workloadColor = "var(--accent-text)"; workloadLabel = "Light";    }

  // Only show non-Director/Manager roles
  const EXEC_ROLES = ["Director", "Manager"];
  if (EXEC_ROLES.includes(member.role)) return null;

  return (
    <button
      type="button"
      onClick={() => onToggle(member.id)}
      className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 w-full text-left"
      style={{
        background:  selected ? `${accent}10` : "rgba(20,32,61,0.02)",
        borderColor: selected ? `${accent}40` : "rgba(20,32,61,0.06)",
      }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-ink/10">
          <img
            src={avatarUrl("bottts", member.avatarSeed ?? member.name)}
            alt={member.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        {selected && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#FFFFFF]"
            style={{ background: accent }}
          >
            <Check size={8} strokeWidth={3} style={{ color: "var(--on-accent)" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">{member.name}</p>
        <p className="text-[14px] text-slate-500">{member.role}</p>
      </div>

      {/* Workload */}
      <div className="flex items-center gap-2 shrink-0">
        {overloaded && <AlertTriangle size={12} className="text-rose-400" />}
        <div className="text-right">
          <span
            className="text-[14px] font-black px-2 py-0.5 rounded-md"
            style={{ color: workloadColor, background: `${workloadColor}18` }}
          >
            {workloadLabel}
          </span>
          <p className="text-[14px] text-slate-600 mt-0.5">{open} active</p>
        </div>
      </div>
    </button>
  );
}

// ── CreateProjectPage ──────────────────────────────────────────────────────────
export default function CreateProjectPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const theme         = useRoleTheme();
  const accent        = theme.accent;

  const [step,             setStep]             = useState(0);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState("");
  const [draftSaved,       setDraftSaved]       = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const draftIdRef   = useRef(null);
  const autoSaveRef  = useRef(null);

  // ── Step 1: Identity ────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [category,    setCategory]    = useState("Other");
  const [clientName,  setClientName]  = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);

  // ── Step 2: Context (optional) ──────────────────────────────────────────────
  const [businessContext,    setBusinessContext]    = useState("");
  const [operationalNotes,   setOperationalNotes]   = useState("");
  const [contextAttachments, setContextAttachments] = useState([]);

  // ── Step 3: Timeline ────────────────────────────────────────────────────────
  const [startDate,         setStartDate]         = useState("");
  const [deadline,          setDeadline]           = useState("");
  const [workingHours,      setWorkingHours]       = useState(7);
  const [xpPool,            setXpPool]             = useState(0);
  const [riskLevel,         setRiskLevel]          = useState("Low");
  const [visibility,        setVisibility]         = useState("team_only");

  const workingDays  = calcWorkingDays(startDate, deadline);
  const totalHours   = workingDays * workingHours;

  // ── Step 4: Milestones ──────────────────────────────────────────────────────
  const [milestones, setMilestones] = useState([
    { title: "", description: "", startDate: "", endDate: "", activeRoles: [], deliverables: [] },
  ]);

  // Inherit project start date into first milestone
  useEffect(() => {
    if (startDate && milestones[0].startDate === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMilestones((prev) => prev.map((ms, i) => i === 0 ? { ...ms, startDate } : ms));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  // ── Load draft from URL param ───────────────────────────────────────────────
  // ── Step 5: Team & Tech ─────────────────────────────────────────────────────
  const [teamList,    setTeamList]    = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [members,     setMembers]     = useState([]);
  const [techInput,   setTechInput]   = useState("");
  const [techStack,   setTechStack]   = useState([]);

  useEffect(() => {
    const id = searchParams.get("draft");
    if (!id) return;
    const draft = loadDrafts().find((d) => d.id === id);
    if (!draft) return;
    draftIdRef.current = draft.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(draft.title                  ?? "");
    setInternalRef(draft.internalRef      ?? "");
    setCategory(draft.category            ?? "Other");
    setClientName(draft.clientName        ?? "");
    setDescription(draft.description      ?? "");
    setBusinessContext(draft.businessContext   ?? "");
    setOperationalNotes(draft.operationalNotes ?? "");
    setStartDate(draft.startDate          ?? "");
    setDeadline(draft.deadline            ?? "");
    setWorkingHours(draft.workingHours    ?? 7);
    setXpPool(draft.xpPool               ?? 0);
    setRiskLevel(draft.riskLevel         ?? "Low");
    setVisibility(draft.visibility       ?? "team_only");
    if (draft.milestones?.length) setMilestones(draft.milestones);
    if (draft.members?.length)    setMembers(draft.members);
    if (draft.techStack?.length)  setTechStack(draft.techStack);
    setStep(draft.step ?? 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save draft (debounced 2s) ─────────────────────────────────────────
  useEffect(() => {
    if (!title.trim()) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const draft = {
        id:      draftIdRef.current ?? `draft_${Date.now()}`,
        savedAt: new Date().toISOString(),
        step, title, internalRef, category, clientName, description,
        businessContext, operationalNotes,
        startDate, deadline, workingHours, xpPool, riskLevel, visibility,
        milestones, members, techStack,
      };
      draftIdRef.current = draft.id;
      upsertDraft(draft);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 1800);
    }, 2000);
    return () => clearTimeout(autoSaveRef.current);
  }, [title, internalRef, category, clientName, description, businessContext, operationalNotes,
      startDate, deadline, workingHours, xpPool, riskLevel, visibility, milestones, members, techStack, step]);

  useEffect(() => {
    if (step === 4 && teamList.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeamLoading(true);
      api.get("/api/manager/team-availability")
        .then((d) => setTeamList(d.members ?? []))
        .catch(() => {})
        .finally(() => setTeamLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function canAdvance() {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return true; // Context step is optional
    if (step === 2) {
      if (!startDate || !deadline) return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(startDate) < today) return false;
      if (new Date(deadline) <= new Date(startDate)) return false;
      return true;
    }
    if (step === 3) return milestones.every((ms) => ms.title.trim().length > 0);
    return true;
  }

  // FE-R018: say why a button is disabled instead of leaving it silent.
  function blockedReason() {
    if (step === 0 && !title.trim()) return "Enter a project title to continue.";
    if (step === 2) {
      if (!startDate || !deadline) return "Pick a start date and a deadline.";
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(startDate) < today) return "The start date cannot be in the past.";
      if (new Date(deadline) <= new Date(startDate)) return "The deadline must be after the start date.";
    }
    if (step === 3 && !milestones.every((ms) => ms.title.trim().length > 0)) return "Give every phase a title.";
    if (step === 4 && members.length === 0) return "Add at least one team member before launching.";
    return "";
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function next() { setError(""); if (step < 4) setStep((s) => s + 1); }
  function back() { setError(""); if (step > 0) setStep((s) => s - 1); }

  // ── Milestone helpers ───────────────────────────────────────────────────────
  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { title: "", description: "", startDate: "", endDate: "", activeRoles: [], deliverables: [] },
    ]);
  }

  // ── Tech stack helpers ──────────────────────────────────────────────────────
  function onTechKey(e) {
    if ((e.key === "Enter" || e.key === ",") && techInput.trim()) {
      e.preventDefault();
      const val = techInput.trim().replace(/,$/, "");
      if (val && !techStack.includes(val)) setTechStack((p) => [...p, val]);
      setTechInput("");
    }
  }

  // ── Draft helpers (manual save) ─────────────────────────────────────────────
  function saveDraftNow() {
    clearTimeout(autoSaveRef.current);
    const draft = {
      id:      draftIdRef.current ?? `draft_${Date.now()}`,
      savedAt: new Date().toISOString(),
      step, title, internalRef, category, clientName, description,
      businessContext, operationalNotes,
      startDate, deadline, workingHours, xpPool, riskLevel, visibility,
      milestones, members, techStack,
    };
    draftIdRef.current = draft.id;
    upsertDraft(draft);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1800);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!title.trim()) { setError("Project title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("title",              title.trim());
      form.append("description",        description);
      form.append("businessContext",    businessContext);
      form.append("operationalNotes",   operationalNotes);
      form.append("category",           category);
      form.append("clientName",         clientName.trim());
      form.append("internalRef",        internalRef.trim());
      form.append("startDate",          startDate);
      form.append("deadline",           deadline);
      form.append("workingHoursPerDay", String(workingHours));
      form.append("xpPool",             String(xpPool));
      form.append("riskLevel",          riskLevel);
      form.append("visibility",         visibility);
      form.append("techStack",          JSON.stringify(techStack));
      form.append("memberIds",          JSON.stringify(members));
      form.append("milestones",         JSON.stringify(
        milestones.filter((ms) => ms.title.trim())
      ));
      [...attachments, ...contextAttachments].forEach((f) => form.append("attachments", f));

      await api.upload("/api/manager/projects", form); // FE-025: shared client (401 handling, timeout)

      if (draftIdRef.current) removeDraft(draftIdRef.current);
      navigate("/manager/projects");
    } catch (err) {
      setError(err.message ?? "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  // ── Timeline step validation feedback ──────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startInPast   = startDate && new Date(startDate) < today;
  const deadlineBefore = startDate && deadline && new Date(deadline) <= new Date(startDate);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Cancel confirmation dialog ── */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(20,32,61,0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm mx-4 rounded-2xl border border-ink/[0.10] p-6 flex flex-col gap-5"
              style={{ background: "#FFFFFF" }}
            >
              <div>
                <h3 className="text-base font-black text-text-primary mb-1">Unsaved project</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Do you want to save this project as a draft before leaving? You can continue it later from the Projects page.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { saveDraftNow(); navigate("/manager/projects"); }}
                  className="w-full py-2.5 rounded-xl text-sm font-black transition-all"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: "var(--on-accent)" }}
                >
                  Save Draft &amp; Exit
                </button>
                <button
                  onClick={() => { if (draftIdRef.current) removeDraft(draftIdRef.current); navigate("/manager/projects"); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                >
                  Discard &amp; Exit
                </button>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-text-primary transition-colors"
                >
                  Keep editing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-ink/[0.06]"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/manager/projects")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={16} /> Projects
        </button>
        <div className="flex items-center gap-4">
          {/* Step progress */}
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <StepDot
                index={i}
                current={step}
                label={label}
                icon={STEP_ICONS[i]}
                accent={accent}
              />
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="w-3 xl:w-10 h-px transition-all duration-300"
                  style={{ background: i < step ? accent : "rgba(20,32,61,0.08)" }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* Draft saved indicator */}
          <AnimatePresence>
            {draftSaved && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="text-[14px] text-emerald-400 font-medium"
              >
                Draft saved
              </motion.span>
            )}
          </AnimatePresence>
          {/* Save Draft button */}
          <button
            onClick={saveDraftNow}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-ink/[0.08] text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all"
          >
            <Paperclip size={12} /> Save Draft
          </button>
          <button
            onClick={() => setShowCancelDialog(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-text-primary transition-colors"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Identity ── */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-text-primary">Project Identity</h2>
                  <p className="text-sm text-slate-500 mt-1">Define what this project is and what it aims to deliver.</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Project Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Client E-Commerce Platform Rebuild"
                    className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-3 text-base font-bold text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
                  />
                </div>

                {/* Internal reference */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Internal Reference <span className="text-slate-600 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    value={internalRef}
                    onChange={(e) => setInternalRef(e.target.value)}
                    placeholder="e.g. PROJ-2026-04, Client code name..."
                    className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
                  />
                </div>

                {/* Category + Client in grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-[#FFFFFF]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Client Name
                      <span
                        className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold"
                        style={{ background: "rgba(109,123,153,0.15)", color: "#4F5B75" }}
                      >
                        INTERNAL ONLY
                      </span>
                    </label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Visible only to managers"
                      className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Description (rich text) */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Project Description <span className="text-rose-500">*</span>
                  </label>
                  <RichTextEditor value={description} onChange={setDescription} accent={accent} />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Attachments
                    <span className="text-slate-600 font-normal normal-case ml-1">
                      — SRS docs, wireframes, timelines, requirements
                    </span>
                  </label>
                  <AttachmentDropzone files={attachments} onChange={setAttachments} />
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Project Context (optional) ── */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-text-primary">Project Context</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Optional — help your team understand the strategic and operational context before work begins.
                  </p>
                </div>

                {/* Optional badge */}
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl border"
                  style={{ background: "rgba(31,87,224,0.06)", borderColor: "rgba(31,87,224,0.20)" }}
                >
                  <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[14px] text-slate-400 leading-relaxed">
                    This step is <strong className="text-text-primary">fully optional</strong>. Skip it and fill in context from the project detail page at any time.
                  </p>
                </div>

                {/* Business Context */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Business Context
                    <span className="text-slate-600 font-normal normal-case ml-1">— why this project exists</span>
                  </label>
                  <p className="text-[14px] text-slate-600 mb-2">
                    What business problem does this solve? What value does it deliver? Who benefits from its completion?
                  </p>
                  <textarea
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    rows={5}
                    placeholder="e.g. Our checkout flow has a 68% drop-off rate. This project redesigns it to reduce abandonment and increase conversion. Primary stakeholder: Head of Revenue."
                    className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 resize-none transition-colors"
                  />
                  <p className="text-[14px] text-slate-600 mt-1">{businessContext.length} / 2000 chars</p>
                </div>

                {/* Operational Notes */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Operational Notes
                    <span className="text-slate-600 font-normal normal-case ml-1">— constraints &amp; instructions</span>
                  </label>
                  <p className="text-[14px] text-slate-600 mb-2">
                    Technical constraints, budget limits, approval requirements, third-party dependencies, or internal rules your team must follow.
                  </p>
                  <textarea
                    value={operationalNotes}
                    onChange={(e) => setOperationalNotes(e.target.value)}
                    rows={4}
                    placeholder="e.g. Must use existing auth service. Max 80 billable hours. No new third-party analytics without legal sign-off. Deploy to staging first — production needs Director approval."
                    className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 resize-none transition-colors"
                  />
                  <p className="text-[14px] text-slate-600 mt-1">{operationalNotes.length} / 1000 chars</p>
                </div>

                {/* Context Documents */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Context Documents
                    <span className="text-slate-600 font-normal normal-case ml-1">— SRS, BRD, wireframes, briefs</span>
                  </label>
                  <p className="text-[14px] text-slate-600 mb-2">
                    Upload specification documents, client briefs, meeting notes, or wireframes that provide strategic context.
                  </p>
                  <AttachmentDropzone files={contextAttachments} onChange={setContextAttachments} />
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Timeline ── */}
            {step === 2 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-text-primary">Timeline & Workload</h2>
                  <p className="text-sm text-slate-500 mt-1">Plan the project schedule and resource time allocation.</p>
                </div>

                {/* Date row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
                    />
                    {startInPast && (
                      <p className="text-[14px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Start date cannot be in the past
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">Deadline <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={deadline}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
                    />
                    {deadlineBefore && (
                      <p className="text-[14px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Deadline must be after start date
                      </p>
                    )}
                  </div>
                </div>

                {/* Working days calculation */}
                {startDate && deadline && !startInPast && !deadlineBefore && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div
                      className="flex flex-col items-center py-4 rounded-2xl border text-center"
                      style={{ background: `${accent}08`, borderColor: `${accent}25` }}
                    >
                      <p className="text-2xl font-black" style={{ color: accent }}>{workingDays}</p>
                      <p className="text-[14px] text-slate-500 mt-0.5 uppercase tracking-wider">Working Days</p>
                      <p className="text-[14px] text-slate-600 mt-1">Mon–Fri only</p>
                    </div>
                    <div
                      className="flex flex-col items-center py-4 rounded-2xl border text-center"
                      style={{ background: "rgba(18,128,59,0.06)", borderColor: "rgba(18,128,59,0.20)" }}
                    >
                      <p className="text-2xl font-black text-[#0E6A30]">{workingHours}h</p>
                      <p className="text-[14px] text-slate-500 mt-0.5 uppercase tracking-wider">Per Day</p>
                      <p className="text-[14px] text-slate-600 mt-1">adjustable below</p>
                    </div>
                    <div
                      className="flex flex-col items-center py-4 rounded-2xl border text-center"
                      style={{ background: "rgba(255,194,26,0.06)", borderColor: "rgba(255,194,26,0.20)" }}
                    >
                      <p className="text-2xl font-black text-[#7A5200]">{totalHours}</p>
                      <p className="text-[14px] text-slate-500 mt-0.5 uppercase tracking-wider">Total Hours</p>
                      <p className="text-[14px] text-slate-600 mt-1">estimated</p>
                    </div>
                  </motion.div>
                )}

                {/* Daily working hours */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Daily Working Hours Allocation
                    <span className="text-slate-600 font-normal normal-case ml-1">— for this project specifically</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1} max={12} step={0.5}
                      value={workingHours}
                      onChange={(e) => setWorkingHours(Number(e.target.value))}
                      className="flex-1"
                      style={{ accentColor: accent }}
                    />
                    <div
                      className="w-16 text-center py-2 rounded-xl font-black text-sm border"
                      style={{ color: accent, borderColor: `${accent}40`, background: `${accent}10` }}
                    >
                      {workingHours}h
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-600 mt-1">
                    Teams may work on multiple projects simultaneously. Allocate only the hours dedicated to this project.
                  </p>
                </div>

                {/* XP Pool */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">XP Pool</label>
                    <div className="group relative">
                      <Info size={13} className="text-slate-600 cursor-help" />
                      <div className="absolute left-0 bottom-6 w-64 p-3 rounded-xl bg-[#FFFFFF] border border-ink/10 text-[14px] text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <strong className="text-text-primary block mb-1">What is the XP Pool?</strong>
                        The total gamification reward distributed across this project's milestones and tasks. Larger, more complex projects should have larger pools. This XP is earned by team members as they complete work.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={xpPool}
                      onChange={(e) => setXpPool(Number(e.target.value))}
                      className="w-40 bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
                    />
                    <div className="flex gap-2">
                      {[1000, 2500, 5000, 10000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setXpPool(v)}
                          className="px-2.5 py-1.5 rounded-lg text-[14px] font-bold border transition-all"
                          style={{
                            background:  xpPool === v ? "rgba(255,194,26,0.15)" : "rgba(20,32,61,0.03)",
                            borderColor: xpPool === v ? "rgba(255,194,26,0.40)"  : "rgba(20,32,61,0.08)",
                            color:       xpPool === v ? "#7A5200"               : "#4F5B75",
                          }}
                        >
                          {v.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(RISK_CONFIGS).map(([level, cfg]) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setRiskLevel(level)}
                        className="flex flex-col gap-1 p-3 rounded-xl border text-left transition-all duration-150"
                        style={{
                          background:  riskLevel === level ? `${cfg.color}12` : "rgba(20,32,61,0.02)",
                          borderColor: riskLevel === level ? `${cfg.color}45`  : "rgba(20,32,61,0.07)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                          <span className="text-xs font-black" style={{ color: riskLevel === level ? cfg.color : "#3A4660" }}>
                            {level}
                          </span>
                        </div>
                        <p className="text-[14px] text-slate-500 leading-relaxed">{cfg.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "team_only", label: "Team Only",        desc: "Only assigned team members can view project details and activity." },
                      { val: "org_wide",  label: "Organisation Wide", desc: "All members across the organisation can view this project." },
                    ].map(({ val, label, desc }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setVisibility(val)}
                        className="flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all duration-150"
                        style={{
                          background:  visibility === val ? `${accent}10` : "rgba(20,32,61,0.02)",
                          borderColor: visibility === val ? `${accent}40`  : "rgba(20,32,61,0.07)",
                        }}
                      >
                        <span className="text-xs font-black" style={{ color: visibility === val ? accent : "#3A4660" }}>
                          {label}
                        </span>
                        <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Milestones ── */}
            {step === 3 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-text-primary">Project Milestones</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Define the major delivery milestones. Milestones can overlap — design, development, and testing can run in parallel.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {milestones.map((ms, i) => (
                      <MilestoneCard
                        key={i}
                        ms={ms}
                        index={i}
                        onChange={(updated) =>
                          setMilestones((prev) => prev.map((m, idx) => idx === i ? updated : m))
                        }
                        onRemove={() => milestones.length > 1 && setMilestones((prev) => prev.filter((_, idx) => idx !== i))}
                        projectStartDate={startDate}
                        accent={accent}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {milestones.length < 12 && (
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-slate-500 hover:text-slate-700 hover:border-ink/20 transition-all w-full justify-center"
                  >
                    <Plus size={15} /> Add Milestone
                  </button>
                )}
              </motion.div>
            )}

            {/* ── Step 4: Team & Tech ── */}
            {step === 4 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-text-primary">Team & Tech Stack</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Assign operational resources and define the technical environment.
                  </p>
                </div>

                {/* Tech stack */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Tech Stack
                    <span className="text-slate-600 font-normal normal-case ml-1">— press Enter or comma to add</span>
                  </label>
                  <input
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={onTechKey}
                    placeholder="React, Node.js, MongoDB, Docker..."
                    className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
                  />
                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {techStack.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border"
                          style={{ color: accent, background: `${accent}12`, borderColor: `${accent}30` }}
                        >
                          {t}
                          <button type="button" onClick={() => setTechStack((p) => p.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">
                            <X size={10} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">
                      Team Members
                      <span className="text-slate-600 font-normal normal-case ml-1">— {members.length} selected</span>
                    </label>
                    <span className="text-[14px] text-slate-600">Directors & Managers are excluded</span>
                  </div>

                  {teamLoading ? (
                    <div className="py-8 text-center text-sm text-slate-600">Loading team availability...</div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                      {teamList
                        .filter((m) => !["Director", "Manager"].includes(m.role))
                        .map((m) => (
                          <MemberRow
                            key={m.id}
                            member={m}
                            selected={members.includes(m.id)}
                            onToggle={(id) => setMembers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                            accent={accent}
                          />
                        ))
                      }
                      {teamList.filter((m) => !["Director", "Manager"].includes(m.role)).length === 0 && (
                        <p className="py-6 text-center text-sm text-slate-600">No operational team members found.</p>
                      )}
                    </div>
                  )}

                  {/* Overload warning */}
                  {members.some((id) => {
                    const m = teamList.find((t) => t.id === id);
                    return m?.availability === "Overloaded";
                  }) && (
                    <div className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[14px] text-rose-300 leading-relaxed">
                        One or more selected members are currently overloaded. Their contribution to this project may be impacted.
                      </p>
                    </div>
                  )}
                </div>

                {/* Review summary */}
                <div className="rounded-2xl border border-ink/[0.08] p-5 bg-ink/[0.02]">
                  <h3 className="text-sm font-bold text-text-primary mb-3">Project Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500">Title</div>
                    <div className="text-text-primary font-medium truncate">{title || "—"}</div>
                    <div className="text-slate-500">Category</div>
                    <div className="text-text-primary font-medium">{category}</div>
                    <div className="text-slate-500">Timeline</div>
                    <div className="text-text-primary font-medium">
                      {startDate && deadline ? `${startDate} → ${deadline}` : "—"}
                    </div>
                    <div className="text-slate-500">Working Days</div>
                    <div className="text-text-primary font-medium">{workingDays} days · {totalHours}h total</div>
                    <div className="text-slate-500">Milestones</div>
                    <div className="text-text-primary font-medium">{milestones.filter((m) => m.title.trim()).length}</div>
                    <div className="text-slate-500">Team</div>
                    <div className="text-text-primary font-medium">{members.length} members</div>
                    <div className="text-slate-500">Risk</div>
                    <div className="font-black" style={{ color: RISK_CONFIGS[riskLevel]?.color }}>{riskLevel}</div>
                    <div className="text-slate-500">XP Pool</div>
                    <div className="text-[#7A5200] font-black">{Number(xpPool).toLocaleString()} XP</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20"
            >
              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div
        className="sticky bottom-0 flex items-center justify-between px-4 sm:px-8 py-4 border-t border-ink/[0.06]"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={back}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-text-primary hover:bg-ink/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} /> Back
        </button>

        <div className="flex items-center gap-3">
          {blockedReason() && <span role="status" className="text-sm font-semibold text-text-secondary">{blockedReason()}</span>}
          <span className="text-xs text-slate-600">Step {step + 1} of {STEP_LABELS.length}</span>
          {step < 4 ? (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow:  `0 4px 20px ${accent}40`,
                color:      "var(--on-accent)",
              }}
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || members.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-60 transition-all"
              style={{
                background: saving ? "rgba(20,32,61,0.06)" : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow:  saving ? "none"                   : `0 4px 20px ${accent}40`,
                color:      saving ? "#4F5B75"                : "var(--on-accent)",
              }}
            >
              {saving ? "Launching..." : "Launch Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
