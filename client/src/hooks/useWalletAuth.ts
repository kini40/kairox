// ─────────────────────────────────────────────────────────────
//  KAIROX – useWalletAuth  (full wallet integration hook)
// ─────────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWalletStore } from '../store/walletStore'
import { useGameStore }   from '../store/gameStore'
import { useUIStore }     from '../store/uiStore'
import { getUserByWallet, createUser } from '../utils/supabase'
import { generateUsername } from '../utils/helpers'

export function useWalletAuth() {
  const wallet       = useWallet()
  const { setVisible } = useWalletModal()
  const walletStore  = useWalletStore()
  const { setMode }  = useGameStore()
  const { addToast } = useUIStore()
  const prevKey      = useRef<string | null>(null)

  // ── Sync wallet state into store ────────────────────────────

  useEffect(() => {
    const pk = wallet.publicKey?.toBase58() ?? null

    if (pk && pk !== prevKey.current) {
      prevKey.current = pk
      walletStore.setConnected(pk, wallet.wallet?.adapter.name ?? 'Wallet')
      setMode('LIVE')
      walletStore.refreshBalances()
      handleWalletConnect(pk)
    } else if (!pk && prevKey.current) {
      prevKey.current = null
      walletStore.setDisconnected()
      setMode('BETA')
      addToast({ type: 'info', title: 'Wallet disconnected', message: 'Switched to BETA mode.' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey?.toBase58(), wallet.connected])

  // ── Auto-refresh balances every 15s when connected ──────────

  useEffect(() => {
    if (!wallet.connected) return
    const t = setInterval(() => walletStore.refreshBalances(), 15_000)
    return () => clearInterval(t)
  }, [wallet.connected, walletStore])

  // ── DB user creation / lookup ────────────────────────────────

  const handleWalletConnect = useCallback(async (pubkey: string) => {
    try {
      const { data: existing } = await getUserByWallet(pubkey)
      if (existing) {
        addToast({
          type: 'success',
          title: `Welcome back, ${existing.username}!`,
          message: 'LIVE mode active.',
        })
      } else {
        const username = generateUsername()
        await createUser(pubkey, username)
        addToast({
          type: 'success',
          title: 'Wallet connected!',
          message: `New account: ${username}. LIVE mode active.`,
        })
      }
    } catch {
      // Non-fatal — game still works without DB
    }
  }, [addToast])

  // ── Public API ───────────────────────────────────────────────

  const connect    = useCallback(() => setVisible(true), [setVisible])
  const disconnect = useCallback(() => wallet.disconnect(), [wallet])

  return {
    connected:    wallet.connected,
    publicKey:    wallet.publicKey,
    shortAddress: walletStore.shortAddress,
    solBalance:   walletStore.solBalance,
    vaultBalance: walletStore.vaultBalance,
    walletName:   walletStore.walletName,
    connect,
    disconnect,
    wallet,          // full adapter state for signing
  }
}
