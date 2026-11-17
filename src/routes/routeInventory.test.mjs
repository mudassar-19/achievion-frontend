// QA4 Y-5: no hidden page. Every real page route of the Manager, Team Lead and Director portals is in the sidebar, or is listed here
// with the place that opens it. A new route that is in neither fails this test. Run: node --test client/src/routes/routeInventory.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./index.jsx", import.meta.url), "utf8");
const layout = (f) => readFileSync(new URL(`../components/layout/${f}`, import.meta.url), "utf8");
const PORTALS = {
  manager:  { root: "/manager",  next: "/teamlead", nav: "ManagerLayout.jsx" },
  teamlead: { root: "/teamlead", next: "/director", nav: "TeamLeadShell.jsx" },
  director: { root: "/director", next: "// Survey",  nav: "DirectorLayout.jsx" },
};
// route (relative) -> what opens it. Detail pages (":id") are reached from their list and are not listed.
const OPENED_BY = {
  manager: { "projects/create": "New project button on Projects", "challenges": "Team Motivation, Challenges is in the nav (sub-route of list)", "profile": "account menu", "notifications": "bell, View all", "settings": "bottom nav" },
  teamlead: { "profile": "account menu", "notifications": "bell, View all", "settings": "bottom nav", "badges": "Leaderboard page link", "avatar": "Profile", "titles": "Profile", "gamification": "My stats link" },
  director: { "profile": "account menu", "notifications": "bell, View all", "settings": "bottom nav", "account-settings": "account menu", "workspace-settings": "Settings page tab", "analytics": "Home card link", "capacity/teams": "Capacity page link", "ask": "AI button" },
};

function pages(p) {
  const a = src.indexOf(`path:    "${p.root}"`), b = src.indexOf(p.next, a + 10);
  const block = src.slice(a, b);
  return [...block.matchAll(/\{ path: "([^":*]+)",\s+element: (<[A-Za-z]+)/g)]
    .filter((m) => !/^<(Navigate|ToManager|ToManagerTask)/.test(m[2])).map((m) => m[1]);
}

for (const [name, p] of Object.entries(PORTALS)) {
  test(`${name}: every page is in the nav or has a named opener`, () => {
    const nav = layout(p.nav), routes = pages(p);
    assert.ok(routes.length > 8, "route parse found the portal");
    const missing = routes.filter((r) => !nav.includes(`"${p.root}/${r}"`) && !OPENED_BY[name][r]);
    assert.deepEqual(missing, [], `pages with no way in: ${missing.join(", ")}`);
  });
}
