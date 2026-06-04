// ─────────────────────────────────────────────────────────────
//  KAIROX – Rival Matchmaking Service
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer } from 'socket.io'
import { supabaseAdmin } from '../config/supabase.js'

export interface RivalData {
  userId:      string
  username:    string
  xp:          number
  rank:        string
  streak:      number
  socketId:    string | null
  isOnline:    boolean
}

export interface RivalSession {
  rivalData:      RivalData
  assignedAt:     number
  myWins:         number   // rounds I won vs rival this session
  rivalWins:      number
  roundsCompared: number
}

// In-memory: userId → RivalSession
const rivalSessions = new Map<string, RivalSession>()

// In-memory: userId → socketId (for online tracking)
export const onlineUsers = new Map<string, { socketId: string; xp: number; username: string; streak: number; rank: string }>()

class RivalService {
  private io: SocketIOServer | null = null

  start(io: SocketIOServer) {
    this.io = io
  }

  // ── Register a user as online ─────────────────────────────

  registerOnline(userId: string, socketId: string, profile: { xp: number; username: string; streak: number; rank: string }) {
    onlineUsers.set(userId, { socketId, ...profile })

    // Notify any rivals that this user just came online
    for (const [uid, session] of rivalSessions.entries()) {
      if (session.rivalData.userId === userId) {
        const mySocket = onlineUsers.get(uid)?.socketId
        if (mySocket) {
          this.io?.to(mySocket).emit('rival:online', {
            username: profile.username,
            message:  `${profile.username} (your rival) just came online!`,
          })
        }
      }
    }
  }

  unregisterOnline(userId: string) {
    onlineUsers.delete(userId)
    rivalSessions.delete(userId)
  }

  // ── Assign rival for session ──────────────────────────────

  async assignRival(userId: string, userXP: number): Promise<RivalData | null> {
    // Check if already has rival this session
    const existing = rivalSessions.get(userId)
    if (existing) return existing.rivalData

    try {
      // Find active online player within ±100 XP, not self
      const candidates: RivalData[] = []

      for (const [uid, data] of onlineUsers.entries()) {
        if (uid === userId) continue
        if (Math.abs(data.xp - userXP) <= 100) {
          candidates.push({
            userId:   uid,
            username: data.username,
            xp:       data.xp,
            rank:     data.rank,
            streak:   data.streak,
            socketId: data.socketId,
            isOnline: true,
          })
        }
      }

      // Fallback: query DB for recently active users
      if (candidates.length === 0) {
        const { data: dbUsers } = await supabaseAdmin
          .from('users')
          .select('id, username, xp, rank, streak_current')
          .neq('id', userId)
          .gte('xp', userXP - 150)
          .lte('xp', userXP + 150)
          .gte('updated_at', new Date(Date.now() - 24 * 3600_000).toISOString())
          .order('xp', { ascending: false })
          .limit(10)

        if (dbUsers?.length) {
          for (const u of dbUsers) {
            candidates.push({
              userId:   u.id,
              username: u.username,
              xp:       u.xp,
              rank:     u.rank,
              streak:   u.streak_current,
              socketId: null,
              isOnline: onlineUsers.has(u.id),
            })
          }
        }
      }

      if (candidates.length === 0) return null

      // Pick closest XP match
      candidates.sort((a, b) => Math.abs(a.xp - userXP) - Math.abs(b.xp - userXP))
      const rival = candidates[0]

      rivalSessions.set(userId, {
        rivalData:      rival,
        assignedAt:     Date.now(),
        myWins:         0,
        rivalWins:      0,
        roundsCompared: 0,
      })

      return rival
    } catch (err) {
      console.error('[RivalService] assignRival error:', err)
      return null
    }
  }

  // ── Record round outcome vs rival ─────────────────────────

  recordRoundOutcome(userId: string, userWon: boolean): {
    myWins: number; rivalWins: number; dominated: boolean; rivalName: string | null
  } | null {
    const session = rivalSessions.get(userId)
    if (!session) return null

    if (userWon) session.myWins++
    else         session.rivalWins++
    session.roundsCompared++

    const dominated = session.myWins >= 10 && session.rivalWins === 0

    return {
      myWins:    session.myWins,
      rivalWins: session.rivalWins,
      dominated,
      rivalName: session.rivalData.username,
    }
  }

  getSession(userId: string): RivalSession | null {
    return rivalSessions.get(userId) ?? null
  }

  // ── Update rival's live streak (received from socket) ─────

  updateRivalStreak(userId: string, streak: number) {
    const session = rivalSessions.get(userId)
    if (session) session.rivalData.streak = streak
  }
}

export const rivalService = new RivalService()
