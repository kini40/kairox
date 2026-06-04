// ─────────────────────────────────────────────────────────────
//  KAIROX – Social Store  (rival, feed, notifications, LB)
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────

export interface RivalData {
  userId:   string
  username: string
  xp:       number
  rank:     string
  streak:   number
  isOnline: boolean
}

export interface RivalRoundResult {
  myWins:    number
  rivalWins: number
  dominated: boolean
  rivalName: string | null
}

export interface FeedEntry {
  id:        string
  socketId:  string
  username:  string
  direction: 'UP' | 'DOWN'
  wager:     number
  mode:      'BETA' | 'LIVE'
  isGhost:   boolean
  isWhale:   boolean
  timestamp: number
  outcome:   'WIN' | 'LOSS' | 'DRAW' | 'NEAR_MISS' | null
  payout:    number
}

export interface Notification {
  id:        string
  type:      string
  title:     string
  message:   string
  icon:      string
  timestamp: number
  read:      boolean
  meta?:     Record<string, unknown>
}

export interface LBEntry {
  rank:              number
  userId:            string
  username:          string
  oracleRank:        string
  totalPredictions:  number
  correctPredictions:number
  winRate:           number
  solWon:            number
  solLost:           number
  xp:                number
  streak:            number
  walletAddress:     string | null
}

export interface LBSnapshot {
  period:           string
  entries:          LBEntry[]
  updatedAt:        number
  biggestWinToday:  { username: string; amount: number } | null
  biggestLossToday: { username: string; amount: number } | null
}

export interface RoundSummary {
  topWinners:   Array<{ username: string; payout: number; direction: string }>
  biggestLoser: { username: string; lost: number } | null
  timestamp:    number
}

// ─── State ────────────────────────────────────────────────────

interface SocialState {
  // Rival
  rival:            RivalData | null
  rivalResult:      RivalRoundResult | null
  showRivalBanner:  boolean
  rivalDominated:   boolean

  // Feed
  feedEntries:      FeedEntry[]

  // Notifications
  notifications:    Notification[]
  unreadCount:      number
  showNotifPanel:   boolean

  // Leaderboard
  lbSnapshots:      Record<string, LBSnapshot>
  lbLoading:        boolean

  // Round summary
  roundSummary:     RoundSummary | null
  showRoundSummary: boolean
}

interface SocialActions {
  // Rival
  setRival:           (rival: RivalData | null) => void
  setRivalResult:     (result: RivalRoundResult) => void
  dismissRivalBanner: () => void
  setRivalDominated:  (v: boolean) => void
  updateRivalOnline:  (isOnline: boolean) => void
  updateRivalStreak:  (streak: number) => void

  // Feed
  addFeedEntry:     (entry: FeedEntry) => void
  prependFeed:      (entries: FeedEntry[]) => void
  flashFeedResult:  (id: string, outcome: string, payout: number) => void

  // Notifications
  addNotification:   (n: Notification) => void
  setNotifications:  (ns: Notification[], unread: number) => void
  markRead:          (id?: string) => void
  toggleNotifPanel:  () => void
  closeNotifPanel:   () => void

  // Leaderboard
  setLBSnapshot: (snapshot: LBSnapshot) => void
  setLBLoading:  (v: boolean) => void

  // Round summary
  setRoundSummary:     (summary: RoundSummary) => void
  dismissRoundSummary: () => void
}

// ─── Store ────────────────────────────────────────────────────

export const useSocialStore = create<SocialState & SocialActions>()(
  devtools((set) => ({
    rival:            null,
    rivalResult:      null,
    showRivalBanner:  false,
    rivalDominated:   false,
    feedEntries:      [],
    notifications:    [],
    unreadCount:      0,
    showNotifPanel:   false,
    lbSnapshots:      {},
    lbLoading:        false,
    roundSummary:     null,
    showRoundSummary: false,

    // ── Rival ───────────────────────────────────────────────
    setRival: (rival) => set({ rival }, false, 'setRival'),

    setRivalResult: (result) => {
      set({ rivalResult: result, showRivalBanner: true }, false, 'setRivalResult')
      setTimeout(() => set({ showRivalBanner: false }), 5000)
    },

    dismissRivalBanner: () => set({ showRivalBanner: false }, false, 'dismissRivalBanner'),

    setRivalDominated: (v) => set({ rivalDominated: v }, false, 'setRivalDominated'),

    updateRivalOnline: (isOnline) => set((s) => ({
      rival: s.rival ? { ...s.rival, isOnline } : null,
    }), false, 'updateRivalOnline'),

    updateRivalStreak: (streak) => set((s) => ({
      rival: s.rival ? { ...s.rival, streak } : null,
    }), false, 'updateRivalStreak'),

    // ── Feed ────────────────────────────────────────────────
    addFeedEntry: (entry) => set((s) => ({
      feedEntries: [entry, ...s.feedEntries].slice(0, 50),
    }), false, 'addFeedEntry'),

    prependFeed: (entries) => set((s) => ({
      feedEntries: [...entries, ...s.feedEntries].slice(0, 50),
    }), false, 'prependFeed'),

    flashFeedResult: (id, outcome, payout) => set((s) => ({
      feedEntries: s.feedEntries.map(e =>
        e.id === id ? { ...e, outcome: outcome as never, payout } : e
      ),
    }), false, 'flashFeedResult'),

    // ── Notifications ───────────────────────────────────────
    addNotification: (n) => set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 30),
      unreadCount:   s.unreadCount + 1,
    }), false, 'addNotification'),

    setNotifications: (ns, unread) => set({
      notifications: ns,
      unreadCount:   unread,
    }, false, 'setNotifications'),

    markRead: (id) => set((s) => {
      if (id) {
        const ns = s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        return { notifications: ns, unreadCount: Math.max(0, s.unreadCount - 1) }
      }
      return { notifications: s.notifications.map(n => ({ ...n, read: true })), unreadCount: 0 }
    }, false, 'markRead'),

    toggleNotifPanel:  () => set((s) => ({ showNotifPanel: !s.showNotifPanel }), false, 'toggleNotifPanel'),
    closeNotifPanel:   () => set({ showNotifPanel: false }, false, 'closeNotifPanel'),

    // ── Leaderboard ─────────────────────────────────────────
    setLBSnapshot: (snapshot) => set((s) => ({
      lbSnapshots: { ...s.lbSnapshots, [snapshot.period]: snapshot },
      lbLoading:   false,
    }), false, 'setLBSnapshot'),

    setLBLoading: (v) => set({ lbLoading: v }, false, 'setLBLoading'),

    // ── Round summary ────────────────────────────────────────
    setRoundSummary: (summary) => {
      set({ roundSummary: summary, showRoundSummary: true }, false, 'setRoundSummary')
      setTimeout(() => set({ showRoundSummary: false }), 5500)
    },

    dismissRoundSummary: () => set({ showRoundSummary: false }, false, 'dismissRoundSummary'),
  }), { name: 'KAIROX-Social' })
)
