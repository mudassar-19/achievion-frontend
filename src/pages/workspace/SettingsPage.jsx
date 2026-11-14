// Shared Settings page, role-aware (U-1, D-131). Sections: Account, Security, Notifications, Preferences.
// What a role can switch comes from GET /api/auth/settings/options, so every toggle maps to a real notification type.
import ProfileDetails from "@/components/ui/ProfileDetails";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { User, Shield, Bell, SlidersHorizontal, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import useUiStore from "@/stores/uiStore";
import api from "@/lib/api";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { BTN } from "@/components/ui/buttons";
import { fmtDateTime } from "@/pages/manager/project/format";

const SECTIONS = [
  { key: "account", label: "Account", icon: User },
  { key: "security", label: "Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
];
const ACCOUNT_PREFS = ["timezone", "dateFormat", "timeFormat"];
const DATE_FORMATS = [["mdy", "Nov 5, 2026"], ["dmy", "5 Nov 2026"], ["iso", "2026-11-05"]];
const ZONES = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch { return []; } })();
const input = "h-10 w-full min-w-0 rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] read-only:bg-bg-muted read-only:text-text-secondary";

function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-text-primary">{label}</label>
      {children}
      {hint && <p className="text-[13px] text-text-secondary">{hint}</p>}
    </div>
  );
}
function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      style={{ background: on ? "var(--accent)" : "rgb(20 32 61 / 0.18)" }}>
      <span aria-hidden="true" className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform" style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}
function Row({ title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary break-words">{title}</p>
        {desc && <p className="mt-0.5 text-[13px] text-text-secondary break-words">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
const Heading = ({ title, sub }) => (
  <div className="mb-5"><h2 className="text-lg font-black text-text-primary">{title}</h2>{sub && <p className="mt-0.5 text-sm text-text-secondary">{sub}</p>}</div>
);

// ── Security: password + sessions (own buttons; nothing for the save bar) ────────
function SecuritySection() {
  const addToast = useUiStore((s) => s.addToast);
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [revoking, setRevoking] = useState(false);
  useEffect(() => { api.get("/api/auth/sessions").then((d) => setSessions(d?.sessions ?? [])).catch(() => setSessions([])); }, []);

  async function save(e) {
    e.preventDefault();
    if (!f.current || !f.next) return setErr("Fill in your current and new password.");
    if (f.next.length < 8) return setErr("The new password needs at least 8 characters.");
    if (f.next !== f.confirm) return setErr("The two new passwords are not the same.");
    setErr(""); setBusy(true);
    try {
      await api.patch("/api/auth/password", { currentPassword: f.current, newPassword: f.next });
      setF({ current: "", next: "", confirm: "" });
      addToast({ type: "success", message: "Password updated." });
    } catch (e2) { setErr(e2.message ?? "Password change failed."); } finally { setBusy(false); }
  }
  async function signOutOthers() {
    setRevoking(true);
    try {
      const d = await api.post("/api/auth/sessions/sign-out-others");
      addToast({ type: "success", message: `${d?.revoked ?? 0} other session(s) signed out.` });
      setSessions((await api.get("/api/auth/sessions"))?.sessions ?? []);
    } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not sign out other sessions." }); } finally { setRevoking(false); }
  }
  const others = (sessions ?? []).filter((s) => !s.isCurrent).length;
  const pw = (k, label, auto) => (
    <Field label={label} htmlFor={`pw-${k}`}>
      <input id={`pw-${k}`} type={show ? "text" : "password"} autoComplete={auto} className={input} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
    </Field>
  );
  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={save} className="flex max-w-sm flex-col gap-4">
        <Heading title="Password" sub="You need your current password to set a new one." />
        {pw("current", "Current password", "current-password")}
        {pw("next", "New password", "new-password")}
        {pw("confirm", "Repeat new password", "new-password")}
        <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />{show ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} Show passwords</label>
        {err && <p role="alert" className="text-sm font-semibold text-[#B01F17]">{err}</p>}
        <div><button type="submit" disabled={busy} className={BTN.primary}>{busy && <Loader2 size={14} className="animate-spin" />}Update password</button></div>
      </form>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Heading title="Active sessions" sub="Devices where you are signed in." />
          <button type="button" onClick={signOutOthers} disabled={revoking || !others} className={`${BTN.secondary} mb-5`}>{revoking && <Loader2 size={14} className="animate-spin" />}Sign out other sessions</button>
        </div>
        {sessions === null ? <div className="h-12 animate-pulse rounded-xl bg-ink/[0.05]" /> : sessions.length === 0 ? <p className="text-sm text-text-secondary">No active sessions found.</p> : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary" title={s.device ?? ""}>{s.device ?? "Unknown device"}</p>
                  <p className="text-[13px] text-text-secondary">{s.ip ?? "—"} · last seen {fmtDateTime(s.lastSeenAt)}</p>
                </div>
                {s.isCurrent && <span className="shrink-0 rounded-md bg-accent-tint px-2 py-0.5 text-xs font-bold text-accent-text">This device</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Celebrations (localStorage, applies per browser) ─────────────────────────
function CelebrationSettings() {
  const celebrations    = useUiStore((s) => s.celebrations);
  const setCelebrations = useUiStore((s) => s.setCelebrations);

  const celebOptions = [
    { value: "full",  label: "Full",  desc: "Mascot in toasts and full-screen moments." },
    { value: "quiet", label: "Quiet", desc: "Plain toasts only, no full-screen effects." },
    { value: "off",   label: "Off",   desc: "No celebration effects at all." },
  ];

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h3 className="text-sm font-black text-text-primary">Celebrations</h3>
      <p className="text-[13px] text-text-secondary -mt-2">These apply on this browser and save right away.</p>

      <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
        <p className="text-[13px] text-text-secondary">Visual effects for badges and level-ups.</p>
        <div className="flex flex-wrap gap-2 mt-1" role="radiogroup" aria-label="Celebration style">
          {celebOptions.map((o) => (
            <label
              key={o.value}
              className={[
                "flex min-h-[36px] cursor-pointer items-center rounded-lg border px-3 text-sm font-semibold transition-colors",
                celebrations === o.value
                  ? "border-accent bg-accent-tint text-accent-text"
                  : "border-border-subtle text-text-secondary hover:bg-bg-muted",
                "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
              ].join(" ")}
            >
              <input type="radio" name="celebrations" value={o.value} checked={celebrations === o.value}
                onChange={() => setCelebrations(o.value)} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-[13px] text-text-secondary mt-1">
          {celebOptions.find((o) => o.value === celebrations)?.desc}
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUiStore((s) => s.addToast);
  const [active, setActive] = useState("account");
  const [opts, setOpts] = useState(null);
  const [saved, setSaved] = useState(null); // { name, prefs, notifs } as on the server
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/api/auth/settings/options"), api.get("/api/auth/me")]).then(([o, me]) => {
      const st = me.user?.settings ?? {};
      const notifs = Object.fromEntries(o.groups.filter((g) => !g.locked).map((g) => [g.key, st.notifications?.[g.key] !== false]));
      const emailNotif = st.emailNotificationsEnabled !== false;
      const s = { name: me.user?.name ?? "", prefs: { landing: "home", dateFormat: "mdy", timeFormat: "12h", timezone: "", aiPanel: true, ...(st.preferences ?? {}) }, notifs, emailNotif };
      setOpts(o); setSaved(s); setDraft(s);
    }).catch((e) => setError(e.message ?? "Could not load your settings."));
  }, []);

  const dirty = useMemo(() => {
    if (!saved || !draft) return {};
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    return {
      account: draft.name.trim() !== saved.name || ACCOUNT_PREFS.some((k) => draft.prefs[k] !== saved.prefs[k]),
      notifications: !same(draft.notifs, saved.notifs) || draft.emailNotif !== saved.emailNotif,
      preferences: ["landing", "aiPanel"].some((k) => draft.prefs[k] !== saved.prefs[k]),
    };
  }, [saved, draft]);

  // Closing or reloading the tab with unsaved changes asks first.
  const anyDirty = Object.values(dirty).some(Boolean);
  useEffect(() => {
    if (!anyDirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  const setPref = (k, v) => setDraft((d) => ({ ...d, prefs: { ...d.prefs, [k]: v } }));

  async function save() {
    setBusy(true);
    try {
      let next = { ...saved }, settings = user?.settings ?? {}, name = user?.name;
      if (active === "account" && draft.name.trim() !== saved.name) {
        if (!draft.name.trim()) throw new Error("Your name cannot be empty.");
        const d = await api.patch("/api/auth/me", { name: draft.name.trim() });
        name = d.user?.name ?? draft.name.trim(); next.name = name;
      }
      const keys = active === "account" ? ACCOUNT_PREFS : active === "preferences" ? ["landing", "aiPanel"] : [];
      if (keys.length && keys.some((k) => draft.prefs[k] !== saved.prefs[k])) {
        const prefs = { ...saved.prefs, ...Object.fromEntries(keys.map((k) => [k, draft.prefs[k]])) };
        settings = (await api.patch("/api/auth/settings", { preferences: prefs })).settings; next.prefs = prefs;
      }
      if (active === "notifications") {
        settings = (await api.patch("/api/auth/settings", { notifications: draft.notifs, emailNotificationsEnabled: draft.emailNotif })).settings;
        next.notifs = draft.notifs; next.emailNotif = draft.emailNotif;
      }
      setSaved(next); setDraft((d) => ({ ...next, prefs: { ...d.prefs, ...next.prefs }, notifs: active === "notifications" ? next.notifs : d.notifs }));
      setUser({ ...user, name, settings });
      addToast({ type: "success", message: `${SECTIONS.find((s) => s.key === active).label} saved.` });
    } catch (e) { addToast({ type: "error", message: e.message ?? "Save failed." }); } finally { setBusy(false); }
  }
  function discard() {
    setDraft((d) => active === "account" ? { ...d, name: saved.name, prefs: { ...d.prefs, ...Object.fromEntries(ACCOUNT_PREFS.map((k) => [k, saved.prefs[k]])) } }
      : active === "notifications" ? { ...d, notifs: saved.notifs, emailNotif: saved.emailNotif } : { ...d, prefs: { ...d.prefs, landing: saved.prefs.landing, aiPanel: saved.prefs.aiPanel } });
  }

  const body = () => {
    if (active === "security") return <SecuritySection />;
    if (active === "account") return (
      <div className="flex flex-col gap-5">
        <Heading title="Account" sub="Your name as others see it. Email and role are set by your organisation." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="set-name"><input id="set-name" className={input} value={draft.name} maxLength={80} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
          <Field label="Email" htmlFor="set-email"><input id="set-email" className={input} value={user?.email ?? ""} readOnly /></Field>
          <Field label="Role" htmlFor="set-role"><input id="set-role" className={input} value={user?.role ?? ""} readOnly /></Field>
        </div>
        <div className="mt-3"><ProfileDetails /></div>
        {opts.dateTime && (<>
          <h3 className="mt-3 text-sm font-black text-text-primary">Date and time</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Time zone" htmlFor="set-tz" hint="Used for dates and times on your pages.">
              <select id="set-tz" className={input} value={draft.prefs.timezone} onChange={(e) => setPref("timezone", e.target.value)}>
                <option value="">This device's time zone</option>
                {ZONES.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Date format" htmlFor="set-df">
              <select id="set-df" className={input} value={draft.prefs.dateFormat} onChange={(e) => setPref("dateFormat", e.target.value)}>
                {DATE_FORMATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Time format" htmlFor="set-tf">
              <select id="set-tf" className={input} value={draft.prefs.timeFormat} onChange={(e) => setPref("timeFormat", e.target.value)}>
                <option value="12h">11:42 AM</option><option value="24h">11:42</option>
              </select>
            </Field>
          </div>
        </>)}
      </div>
    );
    if (active === "notifications") return (
      <div className="flex flex-col gap-5">
        <Heading title="Notifications" sub="Choose which updates reach your bell. Things that need your action are always on." />
        <div className="flex max-w-2xl flex-col gap-2">
          {opts.groups.map((g) => (
            <Row key={g.key} title={g.label} desc={g.desc}>
              {g.locked
                ? <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-text-secondary"><Lock size={13} aria-hidden />Always on</span>
                : <Toggle label={g.label} on={draft.notifs[g.key]} onChange={(v) => setDraft((d) => ({ ...d, notifs: { ...d.notifs, [g.key]: v } }))} />}
            </Row>
          ))}
          <Row title="Email notifications" desc="Send an email for task assignments, reviews, and deadline reminders when you are offline (more than 5 minutes inactive).">
            <Toggle label="Email notifications" on={draft.emailNotif} onChange={(v) => setDraft((d) => ({ ...d, emailNotif: v }))} />
          </Row>
        </div>
        <CelebrationSettings />
      </div>
    );
    return (
      <div className="flex flex-col gap-5">
        <Heading title="Preferences" sub="How the app opens and behaves for you." />
        <div className="grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Open after sign-in" htmlFor="set-land">
            <select id="set-land" className={input} value={draft.prefs.landing} onChange={(e) => setPref("landing", e.target.value)}>
              {opts.landings.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex max-w-2xl flex-col gap-2">
          {opts.aiPanel && <Row title="AI panel" desc="Show the AI button and side panel in the top bar."><Toggle label="AI panel" on={draft.prefs.aiPanel !== false} onChange={(v) => setPref("aiPanel", v)} /></Row>}
          {user?.role === "Manager" && <Row title="Workload limit" desc="When someone counts as over capacity. It applies to your whole team."><Link to="/manager/resources?limit=1" className={BTN.secondary}>Open on Resources</Link></Row>}
        </div>
      </div>
    );
  };

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Your account, password, notifications and preferences." />
      {error ? <ErrorState message={error} /> : !draft ? <div className="h-64 animate-pulse rounded-2xl bg-ink/[0.05]" /> : (
        <div className="flex flex-col gap-6 md:flex-row">
          <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => setActive(key)} aria-current={active === key ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors ${active === key ? "bg-accent-tint text-accent-text" : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"}`}>
                <Icon size={15} aria-hidden />{label}
                {dirty[key] && <span className="ml-auto h-2 w-2 rounded-full bg-[#B25E00]" title="Unsaved changes" aria-label="unsaved changes" />}
              </button>
            ))}
          </nav>
          <section className="relative min-w-0 flex-1 rounded-2xl border border-border-subtle bg-bg-surface/60 p-6">
            {body()}
            {dirty[active] && (
              <div role="region" aria-label="Unsaved changes" className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-border-subtle bg-bg-surface px-6 py-3 shadow-[0_-6px_16px_rgb(20_32_61/0.06)]">
                <p className="text-sm font-semibold text-text-primary">You have unsaved changes.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={discard} disabled={busy} className={BTN.ghost}>Discard</button>
                  <button type="button" onClick={save} disabled={busy} className={BTN.primary}>{busy && <Loader2 size={14} className="animate-spin" />}Save changes</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
