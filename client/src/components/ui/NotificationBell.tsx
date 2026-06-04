import { useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useSocialStore } from '../../store/socialStore'
import { formatRelativeTime } from '../../utils/helpers'

const NOTIF_ICONS: Record<string, string> = {
  rival_online:      '⚔️',
  cashback_ready:    '💰',
  streak_expiring:   '🔥',
  rank_up:           '🏆',
  chest_ready:       '🎁',
  round_result:      '🎯',
  rivalry_dominated: '👑',
}

export function NotificationBell({ userId }: { userId?: string | null }) {
  const { notifications, unreadCount, showNotifPanel, toggleNotifPanel, closeNotifPanel, markRead } = useSocialStore()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeNotifPanel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeNotifPanel])

  const handleOpen = () => {
    toggleNotifPanel()
  }

  const handleMarkAllRead = () => {
    markRead()
    if (userId) {
      import('../../utils/socketService').then(({ socketService }) => {
        socketService.markNotificationsRead(userId)
      })
    }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 8,
          background: showNotifPanel ? 'rgba(226,185,111,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${showNotifPanel ? 'rgba(226,185,111,0.3)' : 'var(--border)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: showNotifPanel ? 'var(--gold)' : 'var(--text-secondary)',
          transition: 'all 0.15s',
        }}
      >
        <Bell size={15} style={{ animation: unreadCount > 0 ? 'heroFloat 2s ease-in-out infinite' : 'none' }} />

        {/* Badge */}
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--red)', color: 'white',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 0 8px rgba(248,113,113,0.6)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification panel */}
      {showNotifPanel && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
          width: 300,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              NOTIFICATIONS
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--gold)', fontWeight: 600,
                  padding: '2px 6px', borderRadius: 4,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '24px 16px', textAlign: 'center',
                color: 'var(--text-dim)', fontSize: 13,
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '11px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: n.read ? 'transparent' : 'rgba(226,185,111,0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(226,185,111,0.04)')}
                >
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {NOTIF_ICONS[n.type] ?? n.icon ?? '🔔'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      marginBottom: 2,
                    }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                      {formatRelativeTime(n.timestamp)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--gold)', flexShrink: 0, marginTop: 4,
                      boxShadow: '0 0 6px rgba(226,185,111,0.6)',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
