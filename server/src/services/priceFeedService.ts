import axios from 'axios'
import type { Server as SocketIOServer } from 'socket.io'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
const POLL_MS       = parseInt(process.env.PRICE_POLL_MS ?? '5000', 10)
const API_KEY       = process.env.COINGECKO_API_KEY

class PriceFeedService {
  lastPrice: number = 0
  private interval: ReturnType<typeof setInterval> | null = null
  private io: SocketIOServer | null = null

  start(io: SocketIOServer) {
    this.io = io
    if (this.interval) return

    this.poll()  // immediate
    this.interval = setInterval(() => this.poll(), POLL_MS)
    console.log(`[PriceFeed] Polling CoinGecko every ${POLL_MS / 1000}s`)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  private async poll() {
    try {
      const headers: Record<string, string> = {}
      if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY

      const { data } = await axios.get(COINGECKO_URL, { headers, timeout: 4000 })
      const price: number = data?.solana?.usd

      if (price && price !== this.lastPrice) {
        this.lastPrice = price
        this.io?.emit('price:update', { price, timestamp: Date.now() })
      }
    } catch (err) {
      console.error('[PriceFeed] Poll error:', err instanceof Error ? err.message : err)
    }
  }
}

export const priceFeedService = new PriceFeedService()
