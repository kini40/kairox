import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { ToastContainer } from '@components/ui/ToastContainer'
import { ModalContainer } from '@components/ui/ModalContainer'

interface RootLayoutProps {
  children: ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="relative min-h-dvh bg-kai-black kai-grid-bg overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7B2FFF 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 right-0 w-80 h-80 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00F5FF 0%, transparent 70%)' }}
        />
      </div>

      <Navbar />

      <main className="relative z-10">
        {children}
      </main>

      {/* Global overlays */}
      <ToastContainer />
      <ModalContainer />
    </div>
  )
}
