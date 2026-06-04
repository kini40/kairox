// ─────────────────────────────────────────────────────────────
//  KAIROX – Wallet Store  (Zustand slice)
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { truncateAddress } from '../utils/solana'

// ─── Types ────────────────────────────────────────────────────

export type TxStatus = 'pending' | 'confirmed' | 'failed'

export interface PendingTx {
  id:          string
  type:        'deposit' | 'withdraw' | 'wager' | 'payout'
  signature:   string | null
  amountSol:   number
  status:      TxStatus
  explorerUrl: string | null
  createdAt:   number
  confirmedAt: number | null
  errorMsg:    string | null
}

export interface WalletState {
  // Connection
  connected:       boolean
  publicKey:       string | null
  shortAddress:    string | null
  walletName:      string | null

  // Balances
  solBalance:       number   // native wallet SOL
  vaultBalance:     number   // in-game escrow balance (SOL)
  balanceLoading:   boolean

  // Transactions
  pendingTxs:      PendingTx[]
  txHistory:       PendingTx[]

  // Modals
  showDepositModal:   boolean
  showWithdrawModal:  boolean

  // Whale
  lastWhaleAlert: {
    wallet:    string
    amountSol: number
    direction: 'UP' | 'DOWN'
    timestamp: number
  } | null
  showWhaleAlert: boolean
}

export interface WalletActions {
  // Connect / disconnect
  setConnected:    (pubkey: string, name: string) => void
  setDisconnected: () => void

  // Balances
  setSolBalance:    (sol: number)   => void
  setVaultBalance:  (sol: number)   => void
  setBalanceLoading:(loading: boolean) => void
  refreshBalances:  () => Promise<void>

  // Transactions
  addPendingTx:    (tx: Omit<PendingTx, 'id' | 'createdAt' | 'confirmedAt' | 'errorMsg'>) => string
  confirmTx:       (id: string, signature: string, explorerUrl: string) => void
  failTx:          (id: string, errorMsg: string) => void
  clearOldTxs:     () => void

  // Modals
  openDeposit:     () => void
  closeDeposit:    () => void
  openWithdraw:    () => void
  closeWithdraw:   () => void

  // Whale
  triggerWhaleAlert: (wallet: string, amountSol: number, direction: 'UP' | 'DOWN') => void
  dismissWhaleAlert: () => void
}

// ─── Store ────────────────────────────────────────────────────

export const useWalletStore = create<WalletState & WalletActions>()(
  devtools(
    persist(
      (set, get) => ({
        // ── Initial state ────────────────────────────────────
        connected:          false,
        publicKey:          null,
        shortAddress:       null,
        walletName:         null,
        solBalance:         0,
        vaultBalance:       0,
        balanceLoading:     false,
        pendingTxs:         [],
        txHistory:          [],
        showDepositModal:   false,
        showWithdrawModal:  false,
        lastWhaleAlert:     null,
        showWhaleAlert:     false,

        // ── Connect / disconnect ─────────────────────────────
        setConnected: (pubkey, name) => set({
          connected:    true,
          publicKey:    pubkey,
          shortAddress: truncateAddress(pubkey),
          walletName:   name,
        }, false, 'setConnected'),

        setDisconnected: () => set({
          connected:      false,
          publicKey:      null,
          shortAddress:   null,
          walletName:     null,
          solBalance:     0,
          vaultBalance:   0,
          pendingTxs:     [],
        }, false, 'setDisconnected'),

        // ── Balances ─────────────────────────────────────────
        setSolBalance:    (sol)     => set({ solBalance:    sol },     false, 'setSolBalance'),
        setVaultBalance:  (sol)     => set({ vaultBalance:  sol },     false, 'setVaultBalance'),
        setBalanceLoading:(loading) => set({ balanceLoading: loading }, false, 'setBalanceLoading'),

        refreshBalances: async () => {
          const { publicKey } = get()
          if (!publicKey) return
          set({ balanceLoading: true })
          try {
            const { getSOLBalance, getVaultBalance } = await import('../utils/solana')
            const { PublicKey } = await import('@solana/web3.js')
            const pk = new PublicKey(publicKey)
            const [sol, vault] = await Promise.all([
              getSOLBalance(pk),
              getVaultBalance(pk),
            ])
            set({ solBalance: sol, vaultBalance: vault, balanceLoading: false })
          } catch {
            set({ balanceLoading: false })
          }
        },

        // ── Transactions ─────────────────────────────────────
        addPendingTx: (tx) => {
          const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          set((s) => ({
            pendingTxs: [{
              ...tx,
              id,
              createdAt:   Date.now(),
              confirmedAt: null,
              errorMsg:    null,
            }, ...s.pendingTxs],
          }), false, 'addPendingTx')
          return id
        },

        confirmTx: (id, signature, explorerUrl) => set((s) => ({
          pendingTxs: s.pendingTxs.map(t =>
            t.id === id
              ? { ...t, status: 'confirmed', signature, explorerUrl, confirmedAt: Date.now() }
              : t
          ),
          txHistory: [
            ...s.pendingTxs.filter(t => t.id === id).map(t => ({
              ...t, status: 'confirmed' as TxStatus, signature, explorerUrl, confirmedAt: Date.now(),
            })),
            ...s.txHistory.slice(0, 49),
          ],
        }), false, 'confirmTx'),

        failTx: (id, errorMsg) => set((s) => ({
          pendingTxs: s.pendingTxs.map(t =>
            t.id === id ? { ...t, status: 'failed', errorMsg } : t
          ),
        }), false, 'failTx'),

        clearOldTxs: () => set((s) => ({
          pendingTxs: s.pendingTxs.filter(
            t => t.status === 'pending' || Date.now() - (t.confirmedAt ?? 0) < 30_000
          ),
        }), false, 'clearOldTxs'),

        // ── Modals ────────────────────────────────────────────
        openDeposit:   () => set({ showDepositModal:  true },  false, 'openDeposit'),
        closeDeposit:  () => set({ showDepositModal:  false }, false, 'closeDeposit'),
        openWithdraw:  () => set({ showWithdrawModal: true },  false, 'openWithdraw'),
        closeWithdraw: () => set({ showWithdrawModal: false }, false, 'closeWithdraw'),

        // ── Whale ─────────────────────────────────────────────
        triggerWhaleAlert: (wallet, amountSol, direction) => {
          set({
            lastWhaleAlert: { wallet, amountSol, direction, timestamp: Date.now() },
            showWhaleAlert: true,
          }, false, 'triggerWhaleAlert')
          // Auto-dismiss after 8s
          setTimeout(() => {
            const current = get().lastWhaleAlert
            if (current && Date.now() - current.timestamp >= 7900) {
              set({ showWhaleAlert: false }, false, 'dismissWhaleAlert:auto')
            }
          }, 8000)
        },

        dismissWhaleAlert: () => set({ showWhaleAlert: false }, false, 'dismissWhaleAlert'),
      }),
      {
        name: 'kairox-wallet',
        partialize: (s) => ({
          publicKey:    s.publicKey,
          walletName:   s.walletName,
          txHistory:    s.txHistory.slice(0, 20),
        }),
      }
    ),
    { name: 'KAIROX-Wallet' }
  )
)
