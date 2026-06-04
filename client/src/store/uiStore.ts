// ─────────────────────────────────────────────────────────────
//  KAIROX – UI Store
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'win' | 'loss'

export interface Toast {
  id:       string
  type:     ToastType
  title:    string
  message?: string
  duration?: number
}

interface UIState {
  toasts: Toast[]
  globalLoading: boolean
}

interface UIActions {
  addToast:       (toast: Omit<Toast, 'id'>) => void
  removeToast:    (id: string) => void
  clearToasts:    () => void
  setGlobalLoading: (v: boolean) => void
}

export const useUIStore = create<UIState & UIActions>()(
  devtools((set) => ({
    toasts:        [],
    globalLoading: false,

    addToast: (toast) => {
      const id  = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const dur = toast.duration ?? 4500
      set((s) => ({ toasts: [...s.toasts.slice(-4), { ...toast, id }] }), false, 'addToast')
      if (dur > 0) setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), dur)
    },

    removeToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }), false, 'removeToast'),

    clearToasts: () => set({ toasts: [] }, false, 'clearToasts'),

    setGlobalLoading: (v) => set({ globalLoading: v }, false, 'setGlobalLoading'),
  }), { name: 'KAIROX-UI' })
)
