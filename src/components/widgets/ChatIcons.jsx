// Chat icons: one line-icon set (lucide, like the sidebar), no emoji (E-C 7, D-QA3B-8). Data and colours: lib/chatIconData.js.
import { Briefcase, Code2, Hash, Lightbulb, Lock, Megaphone, MessageSquare, Palette, Rocket, ShieldCheck, Star, Users } from "lucide-react";
import { COMMUNITY_COLORS, colourFor } from "@/lib/chatIconData";

export function CommunityIcon({ name, size = 16 }) {
  const p = { size, strokeWidth: 2, "aria-hidden": "true" };
  switch (name) {
    case "chat": return <MessageSquare {...p} />;  case "team": return <Users {...p} />;       case "rocket": return <Rocket {...p} />;
    case "code": return <Code2 {...p} />;          case "design": return <Palette {...p} />;    case "idea": return <Lightbulb {...p} />;
    case "work": return <Briefcase {...p} />;      case "star": return <Star {...p} />;         case "shield": return <ShieldCheck {...p} />;
    default: return null;
  }
}

// The community tile: its line icon, or its first letter when it has none (older communities).
export function CommunityTile({ community, size = 32 }) {
  const [bg, fg] = COMMUNITY_COLORS[colourFor(community)];
  return (
    <span aria-hidden="true" className="flex shrink-0 select-none items-center justify-center rounded-lg font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}>
      {CommunityIcon({ name: community?.icon, size: size * 0.55 }) ?? String(community?.name ?? "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

// The line icon in front of a group: Announcements, Leadership (private), everything else a hash.
export function GroupGlyph({ group, size = 15 }) {
  const p = { size, className: "shrink-0", "aria-hidden": "true" };
  return group?.type === "announcement" ? <Megaphone {...p} /> : group?.name === "leadership" ? <Lock {...p} /> : <Hash {...p} />;
}
