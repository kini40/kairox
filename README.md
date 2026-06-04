# KAIROX — Web3 Price Prediction Arena

> Predict. Win. Dominate. The premier SOL/USD prediction game on Solana.

---

## Tech Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | React + Vite + TypeScript + TailwindCSS           |
| Web3       | @solana/web3.js + @solana/wallet-adapter-react    |
| State      | Zustand                                           |
| Real-time  | Socket.io (client + server)                       |
| Backend    | Node.js + Express + Socket.io                     |
| Database   | Supabase (PostgreSQL)                             |
| Price Feed | CoinGecko API                                     |
| Deploy     | GitHub Pages (client) + Railway/Render (server)   |

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/youruser/kairox.git
cd kairox
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment variables

**Client** (`client/.env`):
```bash
cp client/.env.example client/.env
# Fill in your Supabase URL, anon key, etc.
```

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
# Fill in Supabase service role key, CoinGecko key, etc.
```

### 3. Set up Supabase
- Create a project at [supabase.com](https://supabase.com)
- Open the **SQL Editor** and run `supabase_schema.sql`
- Copy your **Project URL** and **anon/service role keys** into `.env` files

### 4. Run development servers
```bash
# From root — runs client + server concurrently
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000
- Health: http://localhost:4000/api/health

---

## Game Modes

### BETA Mode (default)
- No wallet required
- 1,000 free credits on load
- Full game experience — predictions, leaderboard, ranks
- Credits are local only (not saved to DB without wallet)

### LIVE Mode
- Requires Phantom wallet
- Minimum deposit: 0.1 SOL
- Real SOL transactions on Solana

---

## Game Mechanics

| Feature       | Detail                                      |
|---------------|---------------------------------------------|
| Round length  | 60 seconds                                  |
| Base payout   | 1.8× wager on WIN                           |
| Degen payout  | 3.5× wager on WIN (2× wager required)       |
| Ghost mode    | Anonymous prediction — hidden on leaderboard |
| House edge    | 5% (configurable via `HOUSE_EDGE` env var)  |

---

## Rank System

| Rank   | XP Required |
|--------|-------------|
| ROOKIE | 0           |
| TRADER | 500         |
| HUNTER | 2,000       |
| SHARK  | 6,000       |
| ORACLE | 15,000      |
| LEGEND | 40,000      |

---

## Deployment

### Frontend → GitHub Pages
1. Push to `main`
2. GitHub Actions builds and deploys automatically
3. Set `VITE_BASE_URL=/kairox` (your repo name) in GitHub Secrets

### Backend → Railway
1. Connect repo to [Railway](https://railway.app)
2. Set env vars in Railway dashboard
3. Uses `railway.toml` config automatically

### Backend → Render
1. Connect repo to [Render](https://render.com)
2. Uses `render.yaml` config
3. Set env vars in Render dashboard

---

## Project Structure

```
kairox/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── game/          # PriceDisplay, PredictionPanel, RoundTimer…
│       │   ├── layout/        # Navbar, RootLayout
│       │   ├── ui/            # ToastContainer, ModalContainer, ModeBadge
│       │   └── wallet/        # WalletButton
│       ├── hooks/             # useWalletAuth, usePriceFeed, useCountdown
│       ├── pages/             # LandingPage, GamePage, LeaderboardPage, ProfilePage
│       ├── store/             # gameStore, userStore, uiStore (Zustand)
│       └── utils/             # socketService, supabase, priceFeed, helpers
│
├── server/                    # Node + Express backend
│   └── src/
│       ├── routes/            # price, rounds, users, leaderboard
│       ├── services/          # roundManager, priceFeedService, socketHandlers
│       ├── middleware/        # error, rateLimiter
│       └── config/            # supabase admin client
│
├── supabase_schema.sql        # Full DB schema with RLS + leaderboard function
├── railway.toml               # Railway deploy config
├── render.yaml                # Render deploy config
└── .github/workflows/         # GitHub Actions CI/CD
```

---

## Next Steps (Prompt 2+)

- [ ] Solana on-chain escrow program (Anchor)
- [ ] Deposit / withdraw flow
- [ ] Sound effects + background music
- [ ] Weekly loss pool bonus payouts
- [ ] Admin dashboard for round monitoring
- [ ] Mobile PWA manifest
