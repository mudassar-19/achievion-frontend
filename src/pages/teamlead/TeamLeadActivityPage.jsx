import { fmtShort as dShort } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import { CheckCircle2, Clock, Zap, Flag, Target, Users, Activity } from "lucide-react";
import api         from "@/lib/api";
import useTLSocket from "@/hooks/useTLSocket";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const EVENT_CFG = {
  task_completed:      { icon: CheckCircle2, color: "#0E6A30", label: "Task Completed"     },
  task_review:         { icon: Clock,        color: "#1948BD", label: "Sent for Review"    },
  task_started:        { icon: Zap,          color: "#08695F",      label: "Task Started"       },
  task_updated:        { icon: Activity,     color: "#1948BD", label: "Task Updated"       },
  milestone_completed: { icon: Flag,         color: "#0E6A30", label: "Milestone Completed"},
  milestone_updated:   { icon: Flag,         color: "#7A5200", label: "Milestone Updated"  },
  sprint_completed:    { icon: Target,       color: "#0E6A30", label: "Sprint Completed"   },
  sprint_activated:    { icon: Target,       color: "#08695F",      label: "Sprint Activated"   },
  sprint_created:      { icon: Target,       color: "#3A4660", label: "Sprint Created"     },
  resource_request:    { icon: Users,        color: "#9A3A06", label: "Resource Request"   },
};

const TYPE_FILTERS = [
  { key: "all",       label: "All"        },
  { key: "task",      label: "Tasks"      },
  { key: "milestone", label: "Milestones" },
  { key: "sprint",    label: "Sprints"    },
  { key: "resource",  label: "Resources"  },
];

const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };

function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)              return `${s}s ago`;
  if (s < 3600)            return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)           return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7)       return `${Math.floor(s / 86400)}d ago`;
  return dShort(ts);
}



function EventCard({ ev, idx }) {
  const cfg = EVENT_CFG[ev.type] ?? { icon: Activity, color: "#3A4660", label: ev.type };
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0"
      style={{ borderColor: "rgba(20,32,61,0.04)" }}
    >
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
        style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}>
        <Icon size={15} strokeWidth={1.75} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-text-primary">{cfg.label}</span>
          {ev.meta?.priority && (
            <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${PRIORITY_COLOR[ev.meta.priority] ?? "#6D7B99"}15`, color: PRIORITY_COLOR[ev.meta.priority] ?? "#3A4660" }}>
              {ev.meta.priority}
            </span>
          )}
          {ev.meta?.status && (
            <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full bg-ink/[0.06] text-slate-400">
              {ev.meta.status}
            </span>
          )}
        </div>

        {ev.subject && (
          <p className="text-[14px] text-slate-300 mt-0.5 truncate">{ev.subject}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {ev.actor?.name && (
            <span className="flex items-center gap-1 text-[14px] text-slate-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[14px] font-bold"
                style={{ background: `${TEAL}20`, color: TEAL }}>
                {ev.actor.name.charAt(0).toUpperCase()}
              </span>
              {ev.actor.name}
              {ev.actor.role && (
                <span className="capitalize text-slate-700 ml-0.5">· {ev.actor.role.replace(/_/g, " ")}</span>
              )}
            </span>
          )}
          {ev.meta?.urgency && (
            <span className="text-[14px] text-orange-400">{ev.meta.urgency} urgency</span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-[14px] text-slate-600 shrink-0 mt-1">{timeAgo(ev.timestamp)}</span>
    </motion.div>
  );
}

export default function TeamLeadActivityPage() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [limit,   setLimit]   = useState(50);

  const load = useCallback(async (type = "all", lim = 50) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: lim });
      if (type !== "all") params.set("type", type);
      const d = await api.get(`/api/teamlead/activity?${params.toString()}`);
      setEvents(d.events ?? []);
    } catch { setEvents([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(filter, limit); }, [load, filter, limit]);

  useTLSocket({ onRefresh: () => load(filter, limit) });

  const visible = events;

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Activity Feed</h1>
          <p className="text-xs text-slate-500 mt-1">Chronological log of team events across your projects</p>
        </div>
        <button onClick={() => load(filter, limit)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 border border-ink/10 hover:border-ink/20 transition-colors">
          <Activity size={12} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-xl text-[14px] font-bold whitespace-nowrap transition-all"
            style={{
              background: filter === key ? `${TEAL}18` : "transparent",
              color:      filter === key ? "#08695F" : "#4F5B75",
              border:     `1px solid ${filter === key ? TEAL + "30" : "transparent"}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <TallyLoader />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
          style={{ borderColor: `${TEAL}15` }}>
          <Activity size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">No activity events found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
          <AnimatePresence mode="wait">
            <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {visible.map((ev, i) => <EventCard key={ev.id ?? i} ev={ev} idx={i} />)}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Load more */}
      {!loading && visible.length >= limit && (
        <div className="flex justify-center">
          <button onClick={() => setLimit((l) => l + 50)}
            className="text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}20` }}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
