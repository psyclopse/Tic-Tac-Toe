# Tic Tac Toe — Online Multiplayer

A production-ready, real-time multiplayer Tic-Tac-Toe web application built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL + Realtime). Separate frontend and backend for deployment on **Vercel** and **Render**.

## Features

- **Landing page** — enter name, create or join rooms, how-to-play instructions
- **Room system** — unique 6-character codes, copy button, max 2 players, validation
- **Waiting room** — live status until both players join
- **Real-time sync** — board, turns, wins, draws, scores, rematches, presence
- **Game logic** — turn-based play, win/draw detection, winning line highlight
- **Score tracking** — persistent session scores with reset
- **Rematch** — both players must accept before a new round starts
- **Race-condition safe** — atomic moves via PostgreSQL functions + optimistic locking

## Tech Stack

| Layer      | Technology              |
|-----------|-------------------------|
| Frontend   | Next.js 15 (App Router) |
| Backend    | Node.js + Express       |
| Language   | TypeScript              |
| Styling    | Tailwind CSS v4         |
| Database   | Supabase PostgreSQL     |
| Realtime   | Supabase Realtime       |
| Frontend Hosting | Vercel              |
| Backend Hosting  | Render              |

## Quick Start

### 1. Clone and install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration in:

   `supabase/migrations/001_initial_schema.sql`

3. Enable **Realtime** for `rooms` and `players` (the migration adds them to `supabase_realtime`).
4. Copy your project URL and anon key from **Settings → API**.

### 3. Configure environment

**Frontend** — Create `.env.local` in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** — Create `server/.env`:

```env
PORT=3001
NODE_ENV=development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=http://localhost:3000
```

### 4. Run locally

**Terminal 1 — Frontend:**
```bash
npm run dev
```

**Terminal 2 — Backend:**
```bash
cd server && npm run dev
```

Frontend opens at [http://localhost:3000](http://localhost:3000)
Backend API at [http://localhost:3001](http://localhost:3001)

## Deploy to Vercel (Frontend)

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to `.` (default)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com`
5. Deploy.

## Deploy to Render (Backend)

1. Push the repo to GitHub.
2. Create a new **Web Service** in [Render](https://render.com).
3. Connect your GitHub repository.
4. Configure:
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: `.` (leave empty or default)
5. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `FRONTEND_URL=https://your-vercel-domain.vercel.app`
6. Deploy.

## Project Structure

```
.
├── src/                          # Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── room/[code]/page.tsx  # Waiting room + game
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/               # UI components
│   ├── hooks/useRoom.ts          # Realtime subscription + presence
│   └── lib/
│       ├── supabase.ts           # Supabase client & API helpers
│       ├── types.ts
│       └── utils.ts              # Validation & game helpers
├── server/                       # Backend (Express)
│   ├── src/
│   │   └── index.ts              # API server
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── render.yaml
└── supabase/migrations/          # Database schema & RPC functions
```

## Security Notes

- Moves are validated server-side via the `make_move` PostgreSQL function.
- Optimistic locking (`version` column) prevents stale concurrent updates.
- Row Level Security is enabled with permissive policies suitable for room-code access.
- For stricter production use, consider Supabase Auth or signed room tokens.

## License

MIT
