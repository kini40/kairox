// ─────────────────────────────────────────────────────────────
//  KAIROX – App Root  (wallet providers + full routing)
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { Routes, Route } from 'react-router-dom'

// Solana wallet adapter
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Pages
import AdminPage      from './pages/AdminPage'
import LandingPage     from './pages/LandingPage'
import GamePage        from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage     from './pages/ProfilePage'

// Global UI
import { ToastProvider }    from './components/ui/ToastSystem'
import { DepositModal }     from './components/wallet/DepositModal'
import { WithdrawModal }    from './components/wallet/WithdrawModal'
import { WhaleBanner }      from './components/wallet/WhaleBanner'
import { BetaBanner }         from './components/wallet/BetaBanner'
import { RoundSummaryToast }  from './components/game/RoundSummaryToast'
import { NotificationBell }   from './components/ui/NotificationBell'

const NETWORK = (import.meta.env.VITE_SOLANA_NETWORK as 'mainnet-beta' | 'devnet' | 'testnet') || 'devnet'
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(NETWORK)

export default function App() {
  const endpoint = useMemo(() => RPC_URL, [])

  // All supported wallet adapters
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    // BackpackWalletAdapter and CoinbaseWalletAdapter can be added here
    // when their packages are installed:
    // new BackpackWalletAdapter(),
    // new CoinbaseWalletAdapter(),
  ], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ToastProvider>
            {/* Global overlays — always mounted */}
            <DepositModal />
            <WithdrawModal />
            <WhaleBanner />
            <RoundSummaryToast />

            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/game" element={
                <>
                  <BetaBanner />
                  <GamePage />
                </>
              } />
              <Route path="/leaderboard"  element={<LeaderboardPage />} />
              <Route path="/profile/:id?" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </ToastProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
