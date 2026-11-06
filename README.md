# Achievion frontend

Web app for Achievion, a gamified project management platform (React + Vite + Tailwind).

## Run

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev            # build: npm run build
```

## Environment variables

| Name | What |
|---|---|
| `VITE_API_URL` | Backend API base URL, e.g. `http://localhost:3001` |

## Deploy on Vercel

1. Import this repo, framework preset **Vite**, branch `main`.
2. Build command `npm run build`, output directory `dist`.
3. Add `VITE_API_URL` = the backend URL (e.g. `https://achievion-backend.onrender.com`, no trailing slash). It is baked in at build time: redeploy after changing it. The socket uses the same URL.
4. `vercel.json` sends every route to `index.html`, so deep links like `/teamlead/review/123` work on reload.
5. Put the Vercel URL into the backend's `CLIENT_URL`.
