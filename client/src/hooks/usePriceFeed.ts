import { useEffect } from 'react'
import { priceFeed, fetchSOLPriceHistory } from '@utils/priceFeed'
import { useGameStore } from '@store/gameStore'

export function usePriceFeed() {
  const { appendPriceHistory, currentPrice, previousPrice, priceHistory } = useGameStore()

  useEffect(() => {
    // Seed historical data for chart
    fetchSOLPriceHistory().then((history) => {
      history.forEach((point) => appendPriceHistory(point))
    })

    // Start live polling
    priceFeed.start()

    return () => {
      priceFeed.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const priceDirection = currentPrice > previousPrice
    ? 'up'
    : currentPrice < previousPrice
    ? 'down'
    : 'flat'

  const priceChangeAbs  = currentPrice - previousPrice
  const priceChangePct  = previousPrice > 0
    ? ((currentPrice - previousPrice) / previousPrice) * 100
    : 0

  return {
    currentPrice,
    previousPrice,
    priceHistory,
    priceDirection,
    priceChangeAbs,
    priceChangePct,
    isLive: priceFeed.isRunning,
  }
}
