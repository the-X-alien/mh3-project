import { motion } from 'framer-motion'
import { Gauge, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'dashboard' | 'contact'

export default function NavPill({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab
  onTabChange: (t: Tab) => void
}) {
  return (
    <nav className="fixed top-4 right-4 z-40 flex items-center gap-1.5 glass-panel rounded-pill px-2 py-1.5">
      <button
        onClick={() => onTabChange('dashboard')}
        className={cn(
          'flex items-center gap-1.5 rounded-pill px-3 py-1 font-mono text-caption uppercase tracking-wider transition-all',
          activeTab === 'dashboard'
            ? 'bg-violet text-pure'
            : 'text-fog hover:text-pure'
        )}
      >
        <Gauge size={12} />
        Dashboard
      </button>
      <button
        onClick={() => onTabChange('contact')}
        className={cn(
          'flex items-center gap-1.5 rounded-pill px-3 py-1 font-mono text-caption uppercase tracking-wider transition-all',
          activeTab === 'contact'
            ? 'bg-violet text-pure'
            : 'text-fog hover:text-pure'
        )}
      >
        <Heart size={12} />
        Contact
      </button>
    </nav>
  )
}
