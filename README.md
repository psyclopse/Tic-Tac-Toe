# Tic Tac Toe — Online Multiplayer

A production-ready, real-time multiplayer Tic-Tac-Toe web application built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL + Realtime). Deploy directly to **Vercel**.

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
| Framework | Next.js 15 (App Router) |
| Language  | TypeScript              |
| Styling   | Tailwind CSS v4         |
| Database  | Supabase PostgreSQL     |
| Realtime  | Supabase Realtime       |
| Hosting   | Vercel                  |

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration in:

   `supabase/migrations/001_initial_schema.sql`

3. Enable **Realtime** for `rooms` and `players` (the migration adds them to `supabase_realtime`).
4. Copy your project URL and anon key from **Settings → API**.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

No extra server configuration is required — the app is fully static + client-side with Supabase as the backend.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── room/[code]/page.tsx  # Waiting room + game
│   ├── layout.tsx
│   └── globals.css
├── components/               # UI components
├── hooks/useRoom.ts          # Realtime subscription + presence
└── lib/
    ├── supabase.ts           # Supabase client & API helpers
    ├── types.ts
    └── utils.ts              # Validation & game helpers
supabase/migrations/          # Database schema & RPC functions
```

## Security Notes

- Moves are validated server-side via the `make_move` PostgreSQL function.
- Optimistic locking (`version` column) prevents stale concurrent updates.
- Row Level Security is enabled with permissive policies suitable for room-code access.
- For stricter production use, consider Supabase Auth or signed room tokens.

## License

MIT
