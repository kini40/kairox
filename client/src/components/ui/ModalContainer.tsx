import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useUIStore } from '@store/uiStore'

// Modal content imports (stubs for now — filled in next prompt)
function ModalContent() {
  const { activeModal, modalData, closeModal } = useUIStore()

  switch (activeModal) {
    case 'USERNAME_SETUP':
      return <UsernameSetupModal onClose={closeModal} />
    case 'MODE_SWITCH':
      return <ModeSwitchModal onClose={closeModal} data={modalData} />
    case 'DEGEN_WARNING':
      return <DegenWarningModal onClose={closeModal} data={modalData} />
    default:
      return null
  }
}

// ── Inline stub modals (will be replaced with full components) ────────────────

function UsernameSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="font-display text-xl font-bold text-white">Set Your Username</h2>
      <p className="text-sm text-gray-400">A username has been auto-generated. Customize it below.</p>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-neon-cyan flex-1">Save</button>
        <button onClick={onClose} className="btn-ghost-outline flex-1">Skip</button>
      </div>
    </div>
  )
}

function ModeSwitchModal({ onClose, data }: { onClose: () => void; data: Record<string, unknown> }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="font-display text-xl font-bold text-white">Switch to LIVE Mode?</h2>
      <p className="text-sm text-gray-400">
        LIVE mode requires a connected wallet and a minimum deposit of 0.1 SOL.
      </p>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-neon-cyan flex-1">Connect Wallet</button>
        <button onClick={onClose} className="btn-ghost-outline flex-1">Stay in Beta</button>
      </div>
    </div>
  )
}

function DegenWarningModal({ onClose, data }: { onClose: () => void; data: Record<string, unknown> }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="font-display text-xl font-bold text-neon-amber">⚠ DEGEN MODE</h2>
      <p className="text-sm text-gray-400">
        Degen mode multiplies your wager by 2x with a 3.5x payout on wins. High risk, high reward.
      </p>
      <div className="flex gap-3 pt-2">
        <button onClick={() => { (data.onConfirm as () => void)?.(); onClose() }} className="btn-neon-cyan flex-1">
          Activate
        </button>
        <button onClick={onClose} className="btn-ghost-outline flex-1">Cancel</button>
      </div>
    </div>
  )
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ModalContainer() {
  const { activeModal, closeModal } = useUIStore()

  return (
    <AnimatePresence>
      {activeModal && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="kai-card relative overflow-hidden">
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <ModalContent />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
