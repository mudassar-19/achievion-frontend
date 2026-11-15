// Shared XSS-safe markdown renderer (UIA-1). No dependency, no dangerouslySetInnerHTML:
// everything becomes React elements, links only allow http(s)/mailto.
// Used by the topbar AI panel and the full Ask page. ponytail: no tables/nested lists/images; add when AI output needs them.
import { useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function Inline({ text }) {
  return text.split(INLINE).map((p, i) => {
    if (!p) return null;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2)
      return <code key={i} className="rounded bg-ink/[0.06] px-1 py-px font-mono text-[0.92em]">{p.slice(1, -1)}</code>;
    if ((p.startsWith("**") && p.endsWith("**")) || (p.startsWith("__") && p.endsWith("__")))
      return <strong key={i} className="font-semibold text-text-primary"><Inline text={p.slice(2, -2)} /></strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}><Inline text={p.slice(1, -1)} /></em>;
    const m = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (m) {
      return SAFE_URL.test(m[2])
        ? <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline">{m[1]}</a>
        : <span key={i}>{m[1]}</span>;
    }
    return p;
  });
}

const HEAD = { 1: "text-base", 2: "text-[15px]", 3: "text-sm", 4: "text-sm" };

export default function Markdown({ text = "", accent = "currentColor", className = "" }) {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const k = () => out.length;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(<pre key={k()} className="overflow-x-auto rounded-lg bg-ink/[0.05] p-2.5 font-mono text-[12px] leading-snug"><code>{buf.join("\n")}</code></pre>);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = Math.min(h[1].length, 4);
      out.push(<p key={k()} role="heading" aria-level={lvl + 1} className={`${HEAD[lvl]} font-bold leading-snug text-text-primary pt-1`}><Inline text={h[2]} /></p>);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={k()} className="border-l-[3px] pl-3 italic text-text-secondary" style={{ borderColor: accent }}><Inline text={buf.join(" ")} /></blockquote>);
      continue;
    }
    const ul = /^\s*([-*•])\s+/, ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line), re = ordered ? ol : ul, items = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={k()} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 marker:text-text-tertiary`}>
          {items.map((t, n) => <li key={n}><Inline text={t} /></li>)}
        </Tag>
      );
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|>\s?|\s*([-*•]|\d+[.)])\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(<p key={k()}><Inline text={buf.join(" ")} /></p>);
  }
  return <div className={`flex flex-col gap-2 text-sm leading-normal break-words [overflow-wrap:anywhere] ${className}`}>{out}</div>;
}

// A source without a url: click toggles truncated / full text.
function Chip({ label, cls }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} title={label} className={`${cls} text-left hover:bg-ink/[0.04]`}>
      <span className={open ? "whitespace-normal break-words" : "truncate"}>{label}</span>
    </button>
  );
}

// Full source list, every source a chip. A source with a url is a link; otherwise the chip shows its text in the tooltip.
export function SourceChips({ citations = [], className = "" }) {
  if (!citations.length) return null;
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="flex items-center gap-1 text-[11px] font-medium text-text-tertiary"><BookOpen size={11} aria-hidden="true" /> Sources ({citations.length})</span>
      <ul className="flex min-w-0 flex-wrap gap-1.5">
        {citations.map((c, n) => {
          const url = c.url || c.href || c.link;
          const label = `[${n + 1}] ${c.source ?? "source"}${c.text ? ` — ${c.text}` : ""}`;
          const cls = "inline-flex max-w-full min-h-7 items-center gap-1 rounded-full border border-ink/[0.12] bg-white px-2.5 py-0.5 text-[11px] text-text-secondary";
          return (
            <li key={n} className="min-w-0 max-w-full">
              {url && SAFE_URL.test(url)
                ? <a href={url} target="_blank" rel="noopener noreferrer" title={label} className={`${cls} hover:bg-ink/[0.04]`}><span className="truncate">{label}</span><ExternalLink size={10} className="shrink-0" aria-hidden="true" /></a>
                : <Chip label={label} cls={cls} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
