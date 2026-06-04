# KAIROX — Complete Setup Guide

## Prerequisites
- Node.js 20+
- npm 10+
- Git
- A Supabase account (free tier works)
- Phantom/Solflare wallet browser extension (for Live mode)

---

## 1. Clone & Install

```bash
git clone https://github.com/youruser/kairox.git
cd kairox

# Install all workspaces
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

---

## 2. Environment Variables

### Client (`client/.env`)
```bash
cp client/.env.example client/.env
```
Edit `client/.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_BASE_URL=/
VITE_BETA_MODE_ENABLED=true
VITE_HMAC_CLIENT_SECRET=dev_secret_change_in_prod
```

### Server (`server/.env`)
```bash
cp server/.env.example server/.env
```
Edit `server/.env`:
```
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
HMAC_SECRET=dev_secret_change_in_prod
ADMIN_SECRET_KEY=your_admin_password_here
ROUND_DURATION_SECONDS=60
PRICE_POLL_MS=5000
```

---

## 3. Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Open **SQL Editor**
3. Paste and run the entire contents of `supabase_schema.sql`
4. Copy your **Project URL** and **anon key** → paste into `client/.env`
5. Copy your **service_role key** → paste into `server/.env`

---

## 4. Run Development Servers

```bash
# From root — starts both client (port 5173) and server (port 4000)
npm run dev

# Or separately:
npm run dev:client   # React app at http://localhost:5173
npm run dev:server   # Express at http://localhost:4000
```

Open http://localhost:5173

---

## 5. Verify It's Working

- Landing page loads with live SOL price ticker
- Click "Play Beta" → game arena opens
- You have 1,000β credits — make a prediction
- Countdown timer runs, round settles after 60s
- Check http://localhost:4000/api/health

---

## 6. Optional: Anchor Program (Solana smart contract)

> Only needed for Live mode with real SOL. Skip for Beta mode.

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest

# Build the program
cd anchor
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update VITE_PROGRAM_ID in client/.env with deployed program ID
```

---

## 7. Production Deployment

### Frontend → GitHub Pages
1. Push to GitHub
2. Add all `VITE_*` vars as GitHub Secrets
3. GitHub Actions deploys automatically (`.github/workflows/deploy-client.yml`)

### Backend → Railway
1. Connect GitHub repo to [Railway](https://railway.app)
2. Add all server env vars in Railway dashboard
3. Deploys automatically from `railway.toml`

### Backend → Render
```bash
# render.yaml is already configured
# Connect repo at render.com → env vars → deploy
```

---

## 8. Game Modes

| Mode | Requirements | Balance |
|------|-------------|---------|
| **Beta** | None | 1,000 free credits (resets each session) |
| **Live** | Phantom wallet + SOL | Real SOL via on-chain escrow |

---

## 9. Admin Panel

Visit `/admin` in your browser.
Enter the `ADMIN_SECRET_KEY` value from your server `.env`.

Features: Live round status, flagged users, ban/unban, house P&L, security log, transaction audit.

---

## 10. Project Structure

```
kairox/
├── client/            # React + Vite + TypeScript frontend
│   └── src/
│       ├── components/   # UI, game, wallet, layout components
│       ├── hooks/        # Custom React hooks
│       ├── pages/        # Route pages
│       ├── store/        # Zustand state stores
│       └── utils/        # Helpers, API client, Solana utils
├── server/            # Node.js + Express + Socket.io backend
│   └── src/
│       ├── middleware/   # Rate limiter, security headers, CORS
│       ├── routes/       # REST API endpoints
│       ├── security/     # Nonce, HMAC, bot detection, tx verifier
│       ├── services/     # Round manager, price feed, rivals, etc.
│       ├── types/        # Shared TypeScript types
│       └── utils/        # Game logic (pure functions)
├── anchor/            # Solana Anchor smart contract (escrow)
├── supabase_schema.sql   # Full DB schema — run this first
├── SETUP.md           # This file
└── README.md          # Project overview
```
