# Achievion — client

React 18 SPA built with Vite 6.

## Setup

```bash
cp .env.example .env   # set VITE_API_URL=http://localhost:3001
npm install
npm run dev            # Vite dev server; default http://localhost:5173
npm run build          # production build to dist/
npm run preview        # serve the production build locally
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | yes | Backend base URL, e.g. `http://localhost:3001` |
| `VITE_IDLE_TIMEOUT_MS` | no | Idle-logout ms; default `1800000` (30 min) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Hot-reload dev server |
| `npm run build` | Production bundle (Vite) |
| `npm run lint` | ESLint check |
| `npm run preview` | Serve `dist/` locally |
| `npm run audit:director` | Playwright director pixel-diff checks |

## Folder map

```
client/src/
├── pages/           Route-level components grouped by portal
│   ├── workspace/   Employee portal pages (gamification, shop, tasks …)
│   ├── director/    Director portal pages
│   ├── manager/     Manager portal pages
│   └── teamlead/    Team Lead portal pages
├── stores/          Zustand state (auth, gamification, ui, notifications …)
├── components/      Shared UI components
├── utils/           Helpers (shopCosmetics, roleUtils, dateUtils …)
└── App.jsx          Router + PortalShell wiring
```

## State management

Zustand stores with `persist` middleware. Key stores:

| Store | Holds |
|-------|-------|
| `authStore` | `user`, `token`, `isAuthenticated`, `authReady` |
| `gamificationStore` | `currentUser` (XP, gold, HP, streak, level, `shopEquipped`) |
| `uiStore` | theme, celebrations setting |

## Role routing

`ProtectedRoute` checks `authReady` before rendering. Each role lands on its own portal shell and dashboard. Employees share `PortalShell` with role-specific nav tokens (green Developer, coral Designer, amber Tester).

## Lint

ESLint with `plugin:react/recommended`. Ceiling: 47 warnings (tracked in STATUS.md).

## Deploy on Vercel

Full step-by-step guide: `docs/deploy/RUNBOOK.md` (in the main repo).

1. Import the repo, framework preset **Vite**, branch `main`. Build `npm run build`, output `dist`.
2. Set `VITE_API_URL` = the backend address (no trailing slash). It is baked in at build time: redeploy after changing it. The socket uses the same address.
3. `vercel.json` sends every route to `index.html`, so deep links work on reload.
4. Put the Vercel address into the backend's `CLIENT_URL`.
