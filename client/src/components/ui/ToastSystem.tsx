import { useState, useCallback, useEffect } from 'react'
import { createContext, useContext } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastKind = 'win' | 'loss' | 'so-close' | 'streak-lost' | 'info' | 'error' | 'warning'

export interface ToastItem {
  id: string
  kind: ToastKind
  title: string
  message?: string
}

interface ToastCtxType {
  fire: (kind: ToastKind, title: string, message?: string) => void
}

const ToastCtx = createContext<ToastCtxType>({ fire: () => {} })
export const useToast = () => useContext(ToastCtx)

function Toast({ item, onDone }: { item: ToastItem; onDone: (id: string) => void }) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 3200)
    const t2 = setTimeout(() => onDone(item.id), 3600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [item.id, onDone])

  const styles: Record<ToastKind, { bg: string; border: string; anim: string; icon: JSX.Element }> = {
    win: {
      bg: 'linear-gradient(135deg, rgba(226,185,111,0.15), rgba(226,185,111,0.08))',
      border: 'rgba(226,185,111,0.5)',
      anim: 'winExplosion 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      icon: <span style={{ fontSize: 20 }}>🏆</span>,
    },
    loss: {
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.3)',
      anim: 'fadeIn 0.3s ease-out',
      icon: <XCircle size={18} color="#F87171" />,
    },
    'so-close': {
      bg: 'rgba(251,191,36,0.1)',
      border: 'rgba(251,191,36,0.4)',
      anim: 'soClose 0.5s ease-in-out',
      icon: <span style={{ fontSize: 18 }}>😬</span>,
    },
    'streak-lost': {
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.5)',
      anim: 'shake 0.5s ease-in-out',
      icon: <span style={{ fontSize: 18 }}>💔</span>,
    },
    info: {
      bg: 'rgba(139,152,255,0.08)',
      border: 'rgba(139,152,255,0.3)',
      anim: 'slideInRight 0.3s ease-out',
      icon: <Info size={18} color="#8B98FF" />,
    },
    error: {
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.3)',
      anim: 'fadeIn 0.3s ease-out',
      icon: <XCircle size={18} color="#F87171" />,
    },
    warning: {
      bg: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.3)',
      anim: 'fadeIn 0.3s ease-out',
      icon: <AlertTriangle size={18} color="#FBBF24" />,
    },
  }

  const s = styles[item.kind]

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 280,
      maxWidth: 340,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: s.anim,
      opacity: out ? 0 : 1,
      transform: out ? 'translateX(20px)' : 'none',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>{s.icon}</div>
      <div>
        <div style={{
          fontWeight: 700, fontSize: 14,
          color: item.kind === 'win' ? 'var(--gold)'
               : item.kind === 'loss' || item.kind === 'streak-lost' ? 'var(--red)'
               : item.kind === 'so-close' ? 'var(--amber)'
               : 'var(--text-primary)',
        }}>
          {item.title}
        </div>
        {item.message && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {item.message}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const fire = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    setToasts(p => [...p.slice(-3), { id, kind, title, message }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ fire }}>
      {children}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
      }}>
        {toasts.map(t => <Toast key={t.id} item={t} onDone={remove} />)}
      </div>
    </ToastCtx.Provider>
  )
}
