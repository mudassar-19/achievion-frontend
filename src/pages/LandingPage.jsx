import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot, TrendingUp, Code2, Paintbrush2, Bug,
  ArrowRight, Star, Zap, Users, Activity, ShieldAlert,
  BarChart2, Trophy, Cpu,
} from "lucide-react";
import Button from "@/components/ui/Button";

// ── Shared animation helpers ─────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

function SectionReveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeUpItem({ children, className = "" }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

// ── Glassmorphic feature card ────────────────────────────────────────────────
function FeatureCard({ icon: Icon, iconColor, iconBg, borderColor, title, description }) {
  return (
    <motion.div
      variants={fadeUp}
      tabIndex={0}
      role="article"
      className={[
        "flex flex-col gap-4 rounded-2xl p-6 outline-none",
        "bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]",
        "border", borderColor,
        "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/60",
        "active:shadow-[0_1px_6px_rgba(0,0,0,0.25)] active:scale-[0.98]",
        "transition-[transform,box-shadow] duration-100",
      ].join(" ")}
    >
      <span className={["flex h-11 w-11 items-center justify-center rounded-xl", iconBg].join(" ")}>
        <Icon size={22} className={iconColor} strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <p className="text-base text-slate-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ icon: Icon, iconColor, iconBg, borderColor, glowColor, role, tagline, perks }) {
  return (
    <motion.div
      variants={fadeUp}
      tabIndex={0}
      role="article"
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }}
      className={[
        "relative flex flex-col gap-5 rounded-2xl p-6 overflow-hidden outline-none",
        "bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]",
        "border", borderColor,
        "shadow-[0_4px_32px_rgba(0,0,0,0.45)]",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/60",
        "active:shadow-[0_1px_8px_rgba(0,0,0,0.3)] active:scale-[0.98]",
        "transition-[transform,box-shadow] duration-100",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full blur-3xl opacity-30"
        style={{ background: glowColor }}
      />
      <div className="flex items-center gap-3">
        <span className={["flex h-12 w-12 items-center justify-center rounded-xl", iconBg].join(" ")}>
          <Icon size={24} className={iconColor} strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-base font-bold uppercase tracking-widest text-slate-500">Role</p>
          <h3 className="text-base font-black text-text-primary">{role}</h3>
        </div>
      </div>
      <p className="text-base text-slate-400 leading-relaxed">{tagline}</p>
      <ul className="flex flex-col gap-2">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-base text-slate-300">
            <Zap size={12} className={iconColor} strokeWidth={2.5} />
            {perk}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgb(var(--c-accent) / 0.12) 0%, transparent 70%)",
              "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(42,98,236,0.10) 0%, transparent 70%)",
            ].join(", "),
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-accent) / 0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <SectionReveal className="relative z-10 flex flex-col items-center gap-6 max-w-4xl mx-auto">
          <FadeUpItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent-text tracking-widest uppercase">
              <Star size={11} strokeWidth={2.5} />
              Engineering Performance Platform
            </span>
          </FadeUpItem>

          <FadeUpItem>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
              Engineering Management,{" "}
              <span className="text-gradient-brand">Gamified.</span>
            </h1>
          </FadeUpItem>

          <FadeUpItem>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
              Transform sprints into quests. Turn code reviews into XP. Make shipping
              software the most competitive thing your team does all week.
            </p>
          </FadeUpItem>

          <FadeUpItem className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register/step-1">
              <Button variant="primary" size="lg">
                Register Workspace
                <ArrowRight size={16} strokeWidth={2.5} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Employee Login
              </Button>
            </Link>
          </FadeUpItem>


        </SectionReveal>
      </section>



      {/* ── SECTION 1: FOR ENGINEERING LEADERS ───────────────────────────── */}
      <section className="px-6 py-24 bg-bg-base">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Left — copy */}
            <SectionReveal className="flex flex-col gap-6">
              <FadeUpItem>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent-text tracking-widest uppercase">
                  <Users size={11} strokeWidth={2.5} />
                  For Engineering Leaders
                </span>
              </FadeUpItem>
              <FadeUpItem>
                <h2 className="text-4xl font-black text-text-primary leading-tight">
                  Run a high-performance org.{" "}
                  <span className="text-gradient-brand">Not a spreadsheet.</span>
                </h2>
              </FadeUpItem>
              <FadeUpItem>
                <p className="text-slate-400 text-base leading-relaxed max-w-md">
                  Get real-time visibility into team velocity, individual burnout signals,
                  and delivery health — all in one command center built for engineering managers.
                </p>
              </FadeUpItem>
              <FadeUpItem>
                <Link to="/register/step-1">
                  <Button variant="primary" size="lg">
                    Create Your Organisation
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </Button>
                </Link>
              </FadeUpItem>
            </SectionReveal>

            {/* Right — feature cards */}
            <SectionReveal className="grid grid-cols-1 sm:grid-cols-2 gap-4" delay={0.1}>
              <FeatureCard
                icon={Activity}
                iconColor="text-accent-text"
                iconBg="bg-accent/10"
                borderColor="border-accent/20"
                title="Team Velocity"
                description="Track sprint throughput and PR cycle times with automated charts — no manual reporting."
              />
              <FeatureCard
                icon={ShieldAlert}
                iconColor="text-danger"
                iconBg="bg-danger/10"
                borderColor="border-danger/20"
                title="Burnout Radar"
                description="AI flags anomalous patterns before burnout peaks. Intervene early, retain your best engineers."
              />
              <FeatureCard
                icon={Cpu}
                iconColor="text-purple-DEFAULT"
                iconBg="bg-purple-DEFAULT/10"
                borderColor="border-purple-DEFAULT/20"
                title="Org Setup"
                description="Configure departments, set XP rules, and invite your whole team in under five minutes."
              />
              <FeatureCard
                icon={BarChart2}
                iconColor="text-[#7A5200]"
                iconBg="bg-[#FFC21A]/10"
                borderColor="border-[#8A6200]/20"
                title="Delivery Health"
                description="Visualise your release cadence, bug density, and escaped defects in a single live dashboard."
              />
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FOR THE VANGUARD ──────────────────────────────────── */}
      <section className="px-6 py-24 bg-[#F5F6FA]">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Left — feature cards (reversed column order on desktop) */}
            <SectionReveal className="grid grid-cols-1 sm:grid-cols-2 gap-4 order-2 lg:order-1" delay={0.1}>
              <FeatureCard
                icon={Bot}
                iconColor="text-accent-text"
                iconBg="bg-accent/10"
                borderColor="border-accent/20"
                title="AI Code Scoring"
                description="Every commit is evaluated for quality, security, and complexity. Level up your craft with instant feedback."
              />
              <FeatureCard
                icon={Zap}
                iconColor="text-[#7A5200]"
                iconBg="bg-[#FFC21A]/10"
                borderColor="border-[#8A6200]/20"
                title="XP Grinding"
                description="PRs, reviews, deployments, bug fixes — every action earns XP and pushes you toward your next title."
              />
              <FeatureCard
                icon={Trophy}
                iconColor="text-purple-DEFAULT"
                iconBg="bg-purple-DEFAULT/10"
                borderColor="border-purple-DEFAULT/20"
                title="Leaderboards"
                description="Compete with your squad. Weekly and all-time rankings with roles-based categories keep it fair."
              />
              <FeatureCard
                icon={TrendingUp}
                iconColor="text-success"
                iconBg="bg-success/10"
                borderColor="border-success/20"
                title="Streak Multipliers"
                description="Maintain your daily contribution streak to unlock XP multipliers and rare bonus badge drops."
              />
            </SectionReveal>

            {/* Right — copy */}
            <SectionReveal className="flex flex-col gap-6 order-1 lg:order-2">
              <FadeUpItem>
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-DEFAULT/30 bg-purple-DEFAULT/10 px-3 py-1 text-xs font-bold text-purple-DEFAULT tracking-widest uppercase">
                  <Code2 size={11} strokeWidth={2.5} />
                  For The Vanguard
                </span>
              </FadeUpItem>
              <FadeUpItem>
                <h2 className="text-4xl font-black text-text-primary leading-tight">
                  Your code earns{" "}
                  <span className="text-gradient-gold">XP now.</span>
                </h2>
              </FadeUpItem>
              <FadeUpItem>
                <p className="text-slate-400 text-base leading-relaxed max-w-md">
                  Every pull request, code review, and deployment earns XP, feeds your streak,
                  and pushes you up the leaderboard. Your grind finally has a scoreboard.
                </p>
              </FadeUpItem>
              <FadeUpItem>
                <Link to="/register/step-1">
                  <Button variant="secondary" size="md">
                    Register your software house
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </Button>
                </Link>
              </FadeUpItem>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ── ROLES SHOWCASE ───────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-bg-base">
        <div className="mx-auto max-w-6xl flex flex-col gap-14">
          <SectionReveal className="flex flex-col items-center gap-3 text-center">
            <FadeUpItem>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-DEFAULT">
                Built for Every Guild
              </span>
            </FadeUpItem>
            <FadeUpItem>
              <h2 className="text-4xl font-black text-text-primary">
                Your role.{" "}
                <span className="text-gradient-gold">Your legend.</span>
              </h2>
            </FadeUpItem>
            <FadeUpItem>
              <p className="max-w-xl text-slate-400 text-base leading-relaxed">
                Every discipline gets its own XP track, badge tree, and title path.
                No one gets left behind.
              </p>
            </FadeUpItem>
          </SectionReveal>

          <SectionReveal className="grid grid-cols-1 md:grid-cols-3 gap-5" delay={0.05}>
            <RoleCard
              icon={Code2}
              iconColor="text-accent-text"
              iconBg="bg-accent/10"
              borderColor="border-accent/20"
              glowColor="rgb(var(--c-accent) / 0.4)"
              role="Developer Vanguard"
              tagline="For engineers who ship. Every PR merged, every bug crushed, every sprint cleared earns XP toward the next tier."
              perks={["Commit streak bonuses", "PR review XP multiplier", "Code Samurai badge tier"]}
            />
            <RoleCard
              icon={Paintbrush2}
              iconColor="text-purple-DEFAULT"
              iconBg="bg-purple-DEFAULT/10"
              borderColor="border-purple-DEFAULT/20"
              glowColor="rgba(42,98,236,0.4)"
              role="Pixel Mage"
              tagline="Designers are first-class citizens. Figma deliveries, design reviews, and accessibility wins all count."
              perks={["Design review XP", "Accessibility Champion badge", "Sprint delivery bonus"]}
            />
            <RoleCard
              icon={Bug}
              iconColor="text-[#7A5200]"
              iconBg="bg-[#FFC21A]/10"
              borderColor="border-[#8A6200]/20"
              glowColor="rgba(255,194,26,0.4)"
              role="Bug Hunter"
              tagline="QA engineers earn double XP for every critical bug caught before prod. The best hunters climb fast."
              perks={["Critical bug double XP", "Zero-defect sprint badge", "Regression Shield title"]}
            />
          </SectionReveal>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-28 overflow-hidden bg-[#F5F6FA]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgb(var(--c-accent) / 0.07) 0%, transparent 70%)",
          }}
        />
        <SectionReveal className="relative z-10 mx-auto max-w-3xl flex flex-col items-center gap-8 text-center">
          <FadeUpItem>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight text-text-primary">
              Ready to forge your{" "}
              <span className="text-gradient-brand">engineering legacy?</span>
            </h2>
          </FadeUpItem>
          <FadeUpItem>
            <p className="text-slate-400 text-lg max-w-xl">
              Set up your organisation in under 5 minutes. Your team will be earning XP before the next standup.
            </p>
          </FadeUpItem>
          <FadeUpItem className="flex flex-col sm:flex-row gap-4">
            <Link to="/register/step-1">
              <Button variant="primary" size="lg">
                Register Your Company
                <ArrowRight size={16} strokeWidth={2.5} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg">
                Employee Sign In
              </Button>
            </Link>
          </FadeUpItem>
        </SectionReveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-ink/5 bg-[#F5F6FA] px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span
              className="text-base font-black uppercase"
              style={{
                background:           "linear-gradient(90deg, #2A62EC, var(--accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                backgroundClip:       "text",
                letterSpacing:        "0.06em",
              }}
            >
              ACHIEVION
            </span>
          </div>

          <nav className="flex items-center gap-6 text-xs text-slate-500" aria-label="Footer">
            <Link to="/login"          className="hover:text-text-primary transition-colors">Employee Login</Link>
            <Link to="/register/step-1" className="hover:text-text-primary transition-colors">Register</Link>
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
          </nav>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} ACHIEVION · All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}

