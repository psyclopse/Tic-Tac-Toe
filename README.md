# Tic Tac Toe Multiplayer - Hosting Guide

A multiplayer Tic Tac Toe game built with Next.js (frontend) and Express (backend). This guide explains how to host the project on **Vercel** (frontend) and **Render** (backend).

## Architecture Overview

- **Frontend**: Next.js application hosted on Vercel
- **Backend**: Express server hosted on Render
- **Storage**: In-memory (for free tier; can be upgraded with a database)
- **Communication**: REST API with polling for real-time updates

## Prerequisites

Before you begin, ensure you have:
- A GitHub account
- A [Vercel account](https://vercel.com) (sign up with GitHub)
- A [Render account](https://render.com) (sign up with GitHub)

## Project Structure

```
.
├── src/                          # Frontend (Next.js)
│   ├── app/                      # Next.js app directory
│   ├── components/               # React components
│   ├── hooks/                    # Custom hooks
│   └── lib/
│       ├── api.ts               # API client (replaces Supabase)
│       ├── types.ts             # TypeScript types
│       └── utils.ts             # Utility functions
├── server/                       # Backend (Express)
│   ├── src/index.ts             # Express server with game logic
│   └── package.json
├── vercel.json                   # Vercel configuration
├── server/render.yaml            # Render configuration
└── package.json                  # Root package.json
```

## Hosting Instructions

### Step 1: Deploy Backend to Render

#### 1.1 Push to GitHub

Ensure your project is pushed to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tic-tac-toe.git
git push -u origin main
```

#### 1.2 Create Render Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in the service details:
   - **Name**: `tic-tac-toe-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Region**: Choose closest to your location
   - **Plan**: `Free` (or upgrade for better performance)

#### 1.3 Configure Environment Variables

In the Render dashboard, add the following environment variable:

- **Key**: `FRONTEND_URL`
- **Value**: (Leave blank for now; you'll update this after deploying the frontend)

Example: `https://tic-tac-toe-frontend.vercel.app`

#### 1.4 Deploy

Click **"Create Web Service"**. Render will automatically build and deploy. Wait for it to complete (status should show "Live").

**Note**: Keep the Render URL (e.g., `https://tic-tac-toe-server-xxx.onrender.com`). You'll need it in the next step.

---

### Step 2: Deploy Frontend to Vercel

#### 2.1 Create Vercel Project

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Select your GitHub repository
4. Vercel will auto-detect it's a Next.js project

#### 2.2 Configure Environment Variables

Before deploying, add the environment variable:

- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://tic-tac-toe-server-xxx.onrender.com` (your Render backend URL)

#### 2.3 Deploy

Click **"Deploy"**. Vercel will build and deploy your frontend.

**Keep the Vercel URL** (e.g., `https://tic-tac-toe-frontend.vercel.app`).

---

### Step 3: Update Backend CORS Configuration

Now that you have both URLs, update the Render environment variable:

1. Go back to [Render Dashboard](https://dashboard.render.com)
2. Select your `tic-tac-toe-server` service
3. Go to **Settings** → **Environment**
4. Update `FRONTEND_URL`:
   - **Value**: `https://tic-tac-toe-frontend.vercel.app` (your Vercel URL)
5. Click **"Save Changes"**

The service will automatically redeploy with the updated configuration.

---

## Configuration Details

### Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

- `NEXT_PUBLIC_API_URL`: Backend API URL (set in Vercel dashboard)

### Render Configuration (`server/render.yaml`)

```yaml
services:
  - type: web
    name: tic-tac-toe-server
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: FRONTEND_URL
        value: https://your-vercel-domain.vercel.app
```

- `FRONTEND_URL`: Frontend URL for CORS configuration

---

## API Endpoints

The backend provides the following REST API endpoints:

### Rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId` - Get room by ID
- `GET /api/rooms/code/:code` - Get room by code

### Players
- `GET /api/rooms/:roomId/players` - Get players in a room
- `POST /api/rooms/:roomId/players` - Join a room
- `PUT /api/players/:playerId/presence` - Update player presence

### Game
- `POST /api/rooms/:roomId/moves` - Make a move
- `POST /api/rooms/:roomId/rematch` - Request rematch
- `POST /api/rooms/:roomId/reset-scores` - Reset scores

### Health
- `GET /health` - Health check endpoint

---

## Local Development

To run locally during development:

### Terminal 1 (Backend)
```bash
cd server
npm install
npm run dev
```

The backend will run on `http://localhost:3001`

### Terminal 2 (Frontend)
```bash
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
- Verify the `FRONTEND_URL` environment variable is set correctly on Render
- Ensure `NEXT_PUBLIC_API_URL` is set correctly on Vercel
- The URLs should include the protocol (`https://`) but no trailing slash

### API Connection Errors
If the frontend can't connect to the backend:
- Check that the Render backend is running (status "Live" on Render dashboard)
- Verify the `NEXT_PUBLIC_API_URL` matches your Render service URL
- Check browser console for the exact error message

### Render Free Tier Limitations
- Services may spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Consider upgrading to a paid plan for production use

### Vercel Deployment Issues
- Check deployment logs in Vercel dashboard
- Ensure all npm dependencies are installed
- Verify `next.config.ts` is properly configured

---

## Performance Tips

1. **Enable Caching**: Vercel caches static assets automatically
2. **Monitor**: Use Render and Vercel dashboards to monitor performance
3. **Database Upgrade**: Current implementation uses in-memory storage. For production, consider adding a database (PostgreSQL, MongoDB, etc.)
4. **WebSockets**: Current implementation uses REST API with polling. For real-time games, consider upgrading to WebSockets

---

## Next Steps (Optional Enhancements)

- **Database Integration**: Replace in-memory storage with PostgreSQL or MongoDB
- **Authentication**: Add user accounts and authentication
- **Leaderboard**: Store player statistics and create a leaderboard
- **WebSockets**: Upgrade from polling to WebSocket for better real-time performance
- **Mobile App**: Create a React Native version for mobile

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Render and Vercel documentation
- Check browser console for error messages

---

## License

This project is provided as-is for personal use.
