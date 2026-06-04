import { useGameStore } from '@store/gameStore'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY

// ─── Fetch current SOL/USD price ──────────────────────────────────────────────

export async function fetchSOLPrice(): Promise<number> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY

    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=solana&vs_currencies=usd`,
      { headers }
    )

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
    const data = await res.json()
    return data.solana.usd as number
  } catch (err) {
    console.error('[PriceFeed] CoinGecko failed:', err)
    // Fallback: return current store price or 0
    return useGameStore.getState().currentPrice || 0
  }
}

// ─── Fetch OHLC history for chart (last 24h) ──────────────────────────────────

export async function fetchSOLPriceHistory(): Promise<Array<{ timestamp: number; price: number }>> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY

    const res = await fetch(
      `${COINGECKO_BASE}/coins/solana/market_chart?vs_currency=usd&days=1&interval=5m`,
      { headers }
    )
    if (!res.ok) throw new Error(`CoinGecko chart error: ${res.status}`)
    const data = await res.json()

    return (data.prices as [number, number][]).map(([timestamp, price]) => ({
      timestamp,
      price,
    }))
  } catch (err) {
    console.error('[PriceFeed] Chart data failed:', err)
    return []
  }
}

// ─── Price feed manager ───────────────────────────────────────────────────────

class PriceFeedManager {
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private readonly POLL_MS = 5000  // 5s polling (free tier friendly)

  start() {
    if (this.pollInterval) return
    // Initial fetch
    this.poll()
    this.pollInterval = setInterval(() => this.poll(), this.POLL_MS)
    console.log('[PriceFeed] Started polling CoinGecko every', this.POLL_MS / 1000, 's')
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async poll() {
    const price = await fetchSOLPrice()
    if (price > 0) {
      const { updatePrice, appendPriceHistory } = useGameStore.getState()
      updatePrice(price)
      appendPriceHistory({ price, timestamp: Date.now() })
    }
  }

  get isRunning() {
    return this.pollInterval !== null
  }
}

export const priceFeed = new PriceFeedManager()

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatPrice(price: number, decimals = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

export function formatPriceChangePercent(current: number, previous: number): string {
  if (!previous) return '0.00%'
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
