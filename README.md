# Tic Tac Toe — Online Multiplayer

A production-ready, real-time multiplayer Tic-Tac-Toe web application built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Express.js**. Separate frontend and backend for deployment on **Vercel** and **Render**.

## Features

- **Landing page** — enter name, create or join rooms, how-to-play instructions
- **Room system** — unique 6-character codes, copy button, max 2 players, validation
- **Waiting room** — live status until both players join
- **Real-time sync** — board, turns, wins, draws, scores, rematches, presence
- **Game logic** — turn-based play, win/draw detection, winning line highlight
- **Score tracking** — persistent session scores with reset
- **Rematch** — both players must accept before a new round starts
- **Server-validated moves** — prevent cheating with backend validation

## Tech Stack

| Layer      | Technology              |
|-----------|-------------------------|
| Frontend   | Next.js 15 (App Router) |
| Backend    | Node.js + Express       |
| Language   | TypeScript              |
| Styling    | Tailwind CSS v4         |
| Frontend Hosting | Vercel              |
| Backend Hosting  | Render              |

## Quick Start — Deploy to Production

This project is ready to deploy. Follow the guides below to host the frontend on **Vercel** and backend on **Render**.

### Prerequisites

- GitHub account
- Vercel account (free at [vercel.com](https://vercel.com))
- Render account (free at [render.com](https://render.com))
- Your code pushed to GitHub

## Deploy to Vercel (Frontend)

### Step-by-Step Guide

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Select the **Tic Tac Toe** repository

3. **Configure Project Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (leave as default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Set Environment Variables**
   Click **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com` (add after backend is deployed)

5. **Deploy**
   - Click **Deploy**
   - Wait for build to complete
   - Your frontend will be live at `https://your-project.vercel.app`

6. **Update Backend URL (After Render Deployment)**
   - Go back to Vercel project
   - Update `NEXT_PUBLIC_API_URL` environment variable with your Render URL
   - Trigger a redeployment

---

## Deploy to Render (Backend)

### Step-by-Step Guide

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for backend deployment"
   git push origin main
   ```

2. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Click **New +** → **Web Service**
   - Select **GitHub** and authorize
   - Search for and select your repository

3. **Configure Service**
   - **Name**: `tic-tac-toe-server` (or your preference)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `npm start` (with render.yaml) or `node server/dist/index.js`
   - **Plan**: Free (or paid for production)

4. **Set Environment Variables**
   Click **Environment** and add:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `FRONTEND_URL` = `https://your-project.vercel.app` (add after frontend is deployed)

5. **Deploy**
   - Click **Create Web Service**
   - Wait for build and deployment to complete
   - Your backend will be live at `https://your-backend.onrender.com`
   - Copy this URL

6. **Update Frontend URL (After Vercel Deployment)**
   - Go back to Render dashboard
   - Update `FRONTEND_URL` environment variable with your Vercel URL
   - Click **Manual Deploy** → **Deploy Latest Commit**

---

## Deployment Checklist

- [ ] GitHub repository with both frontend and backend code
- [ ] Vercel account created
- [ ] Render account created
- [ ] Backend deployed to Render (get the URL)
- [ ] Frontend environment variables set with backend URL
- [ ] Frontend deployed to Vercel (get the URL)
- [ ] Backend environment variables updated with frontend URL
- [ ] Backend redeployed
- [ ] Test the app at Vercel URL

---

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

- API requests are authenticated and validated on the backend.
- Server-side validation prevents unauthorized game moves.
- CORS is configured to allow only requests from your Vercel frontend.

## License

MIT
