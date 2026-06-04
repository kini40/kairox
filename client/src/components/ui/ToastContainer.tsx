import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, XCircle, AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { useUIStore, type Toast, type ToastType } from '@store/uiStore'
import { cn } from '@utils/helpers'

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
  win:     TrendingUp,
  loss:    TrendingDown,
}

const STYLES: Record<ToastType, string> = {
  success: 'border-neon-green/30  bg-neon-green/10  text-neon-green',
  error:   'border-neon-red/30    bg-neon-red/10    text-neon-red',
  warning: 'border-neon-amber/30  bg-neon-amber/10  text-neon-amber',
  info:    'border-neon-cyan/30   bg-neon-cyan/10   text-neon-cyan',
  win:     'border-bull/40        bg-bull/10        text-bull',
  loss:    'border-bear/40        bg-bear/10        text-bear',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore()
  const Icon = ICONS[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative flex items-start gap-3 rounded-kai border px-4 py-3 shadow-card-kai min-w-72 max-w-sm',
        STYLES[toast.type]
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs opacity-75 text-white/70">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts } = useUIStore()

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[100] flex flex-col gap-2 items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
