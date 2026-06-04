import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSOL(amount: number, decimals = 3): string {
  return `${amount.toFixed(decimals)} SOL`
}

export function formatCredits(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function calculatePayout(wager: number, isDegen: boolean): number {
  return wager * (isDegen ? 3.5 : 1.8)
}

export function calculateWinRate(wins: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((wins / total) * 100)}%`
}
export function generateUsername(): string { const a = ['Swift','Bold','Brave']; const n = ['Trader','Wolf','Eagle']; return a[Math.floor(Math.random()*a.length)]+n[Math.floor(Math.random()*n.length)]+Math.floor(Math.random()*999); } 
