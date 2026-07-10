# Tic Tac Toe — Online Multiplayer

A production-ready multiplayer Tic-Tac-Toe web app:

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS → hosted on **Vercel**
- **Backend**: Express API → hosted on **Render**
- **Sync**: REST API with polling (1s interval)

---

## Architecture

```
Browser (Next.js on Vercel)
        │
        │  HTTPS  NEXT_PUBLIC_API_URL
        ▼
Express API (Render)
        │
        └── In-memory game state (rooms, players, boards)
```

| Component | Host | URL example |
|-----------|------|-------------|
| Frontend | Vercel | `https://tic-tac-toe.vercel.app` |
| Backend | Render | `https://tic-tac-toe-api.onrender.com` |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account (free)
- [Render](https://render.com) account (free)

---

## Project structure

```
.
├── src/                    # Next.js frontend
│   ├── app/                # Pages (home + room)
│   ├── components/         # UI components
│   ├── hooks/useRoom.ts    # Polling + presence
│   └── lib/
│       ├── api.ts          # Backend API client
│       ├── types.ts
│       └── utils.ts
├── server/                 # Express backend
│   ├── src/index.ts        # API + game logic
│   └── package.json
├── render.yaml             # Render Blueprint (backend)
├── vercel.json             # Vercel config (frontend)
├── .env.example            # Frontend env template
└── server/.env.example     # Backend env template
```

---

## Local development

### 1. Install dependencies

**Frontend (repo root):**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### 2. Configure environment variables

**Frontend** — create `.env.local` in the project root:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** — create `server/.env`:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Run both services

**Terminal 1 — backend:**
```bash
cd server
npm run dev
```
API runs at `http://localhost:3001`. Health check: `http://localhost:3001/health`

**Terminal 2 — frontend:**
```bash
npm run dev
```
App runs at `http://localhost:3000`

### 4. Verify locally

1. Open `http://localhost:3000`
2. Enter a name and create a room
3. Open a second browser/incognito window, join with the room code
4. Play a full game (moves, win/draw, rematch, reset scores)

### 5. Build check (recommended before deploy)

```bash
# Backend
cd server
npm run build
npm run typecheck

# Frontend
cd ..
npm run build
npm run typecheck
```

---

## Deploy to Render (backend)

Deploy the **backend first** so you have the API URL for Vercel.

### Option A — Blueprint (`render.yaml`)

1. Push the repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` at the repo root and creates the `tic-tac-toe-api` service
5. When prompted, set the **`FRONTEND_URL`** environment variable:
   - For now use a placeholder: `http://localhost:3000`
   - You will update this after Vercel deploy (Step 3 below)

### Option B — Manual Web Service

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `tic-tac-toe-api` |
| **Root Directory** | `.` (repo root) |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build:server` |
| **Start Command** | `npm run start:server` |
| **Health Check Path** | `/health` |
| **Plan** | Free |

4. Add environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `http://localhost:3000` (update after Vercel deploy) |

5. Click **Create Web Service** and wait until status is **Live**

6. Copy your Render URL, e.g. `https://tic-tac-toe-api.onrender.com`

7. Test the API:
   ```bash
   curl https://YOUR-RENDER-URL.onrender.com/health
   ```
   Expected: `{"status":"ok","timestamp":"..."}`

### Render free tier notes

- Services spin down after ~15 minutes of inactivity
- First request after sleep can take ~30 seconds
- In-memory data is **lost on restart** (rooms reset when the service redeploys or sleeps)

---

## Deploy to Vercel (frontend)

### 1. Import project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Add New** → **Project**
3. Import your GitHub repository
4. Vercel auto-detects Next.js

### 2. Configure build settings

These should be detected automatically. Confirm:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `.` (repo root) |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |
| **Output Directory** | *(leave default — do not set `.next` manually)* |

### 3. Environment variables

Add in Vercel → **Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RENDER-URL.onrender.com` | Production, Preview, Development |

**Important:**
- Use your Render backend URL
- **No trailing slash**
- Must include `https://`

Example:
```
NEXT_PUBLIC_API_URL=https://tic-tac-toe-api.onrender.com
```

### 4. Deploy

Click **Deploy**. When finished, copy your Vercel URL, e.g. `https://tic-tac-toe.vercel.app`

---

## Connect frontend and backend (CORS)

After both are deployed, update Render so the API accepts requests from Vercel:

1. Open your Render service → **Environment**
2. Set **`FRONTEND_URL`** to your Vercel URL(s), comma-separated if needed:

```env
FRONTEND_URL=https://tic-tac-toe.vercel.app,https://tic-tac-toe-git-main-youruser.vercel.app
```

3. Save — Render redeploys automatically

4. In Vercel, confirm `NEXT_PUBLIC_API_URL` points to your Render URL

5. Test production:
   - Open the Vercel URL in two browsers
   - Create a room, join, and play

---

## Environment variable reference

### Frontend (Vercel / `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Render backend URL (no trailing slash) |

### Backend (Render / `server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Set automatically by Render; default `3001` locally |
| `NODE_ENV` | Yes (prod) | `production` on Render |
| `FRONTEND_URL` | Yes | Allowed CORS origin(s), comma-separated |

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/code/:code` | Get room by code |
| GET | `/api/rooms/:roomId` | Get room by ID |
| GET | `/api/rooms/:roomId/players` | List players |
| POST | `/api/rooms/:roomId/players` | Join room |
| PUT | `/api/players/:playerId/presence` | Update connection status |
| POST | `/api/rooms/:roomId/moves` | Make a move |
| POST | `/api/rooms/:roomId/rematch` | Request rematch |
| POST | `/api/rooms/:roomId/reset-scores` | Reset scores |

---

## Troubleshooting

### CORS errors in browser console

- Confirm `FRONTEND_URL` on Render **exactly** matches your Vercel URL (including `https://`, no trailing slash)
- Include preview URLs if testing preview deployments
- Redeploy Render after changing `FRONTEND_URL`

### Frontend cannot reach API

- Verify `NEXT_PUBLIC_API_URL` in Vercel
- Open `https://YOUR-RENDER-URL.onrender.com/health` in a browser
- On Render free tier, wait ~30s for cold start after idle period
- Redeploy Vercel after changing env vars (or trigger a new deployment)

### "Invalid room code" after server restart

Render free tier uses **in-memory storage**. Redeploys and cold starts wipe all rooms. Create a new room after restart.

### Build fails on Vercel

```bash
npm run build
npm run typecheck
```
Fix errors locally, commit, and push.

### Build fails on Render

```bash
cd server
npm run build
npm run typecheck
```

### Room full / duplicate player

- Max 2 players per room
- Same browser session can rejoin; a third distinct player is blocked

---

## Deployment checklist

- [ ] GitHub repo pushed
- [ ] Render backend deployed and `/health` returns OK
- [ ] Vercel frontend deployed with `NEXT_PUBLIC_API_URL`
- [ ] Render `FRONTEND_URL` updated to Vercel URL
- [ ] Two-browser multiplayer test passed in production
- [ ] Rematch and reset scores tested

---

## Scripts

**Frontend (root):**
```bash
npm run dev        # Dev server :3000
npm run build      # Production build
npm run start      # Run production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

**Backend (`server/`):**
```bash
npm run dev        # Dev server with hot reload
npm run build      # Compile to dist/
npm run start      # Run compiled server
npm run typecheck  # TypeScript check
```

---

## License

MIT
