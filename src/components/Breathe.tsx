import { motion } from 'framer-motion'
import { Wind, Play } from 'lucide-react'
import { useWellness } from '@/context/WellnessContext'
import { useAuth } from './AuthProvider'
import { logWellnessEvent } from '@/lib/wellness'
import Seo from './Seo'

const STEPS = [
  { phase: 'Breathe In', secs: 4, desc: 'Slowly fill your lungs through your nose.' },
  { phase: 'Hold', secs: 2, desc: 'Pause and let the calm settle.' },
  { phase: 'Breathe Out', secs: 6, desc: 'Gently release all tension through your mouth.' },
]

export default function Breathe() {
  const { state, startBreathing, addCheckIn } = useWellness()
  const { user } = useAuth()

  const handleStart = () => {
    startBreathing()
    addCheckIn()
    if (user) void logWellnessEvent(user.id, 'breathing', state.stress, { source: 'breathe-page' })
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto pt-10">
      <Seo title="Guided Breathing Exercise — 4-2-6 Box Breathing" description="Follow Shanti's guided breathing exercise — a 4-second inhale, 2-second hold, 6-second exhale cycle repeated four times to reduce stress and anxiety." path="/breathe" />
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="font-cursive text-4xl text-pure">Take a breath</h1>
        <p className="font-body text-sm text-fog max-w-xs mx-auto">
          A guided 4·2·6 cycle, repeated four times. Find a comfortable position and follow along.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center py-4"
      >
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-36 h-36 rounded-full border-2 border-amber/40 flex items-center justify-center bg-amber/[0.04]"
        >
          <Wind size={48} className="text-amber/70" />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        {STEPS.map((s) => (
          <div key={s.phase} className="rounded-2xl bg-glass border border-white/5 p-4 text-center space-y-1.5">
            <p className="font-mono text-2xl text-amber">{s.secs}s</p>
            <p className="font-body text-xs text-pure">{s.phase}</p>
            <p className="font-body text-[10px] text-fog/60 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleStart}
        className="w-full py-3.5 rounded-2xl bg-amber/10 border border-amber/30 text-amber font-body text-sm hover:bg-amber/15 transition-colors flex items-center justify-center gap-2"
      >
        <Play size={16} />
        Start breathing session
      </motion.button>
    </div>
  )
}
