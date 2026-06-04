import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="font-display text-8xl font-black text-kai-border">404</div>
      <div>
        <h2 className="font-display text-xl font-bold text-white">Page Not Found</h2>
        <p className="mt-2 text-sm text-gray-500">This arena doesn't exist. Yet.</p>
      </div>
      <button onClick={() => navigate('/')} className="btn-neon-violet">
        <ArrowLeft size={14} />
        Back to Home
      </button>
    </div>
  )
}
