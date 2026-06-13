import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Heart, Wind } from 'lucide-react'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import { scaleIn } from '@/lib/animations'

function BreathingCircle() {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')

  useEffect(() => {
    const cycle = async () => {
      setPhase('inhale')
      await new Promise((r) => setTimeout(r, 4000))
      setPhase('hold')
      await new Promise((r) => setTimeout(r, 2000))
      setPhase('exhale')
      await new Promise((r) => setTimeout(r, 4000))
    }
    const id = setInterval(cycle, 10000)
    cycle()
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 my-6">
      <motion.div
        animate={{
          scale: phase === 'inhale' ? 1.4 : phase === 'hold' ? 1.4 : 1,
          opacity: phase === 'exhale' ? 0.6 : 1,
        }}
        transition={{ duration: 4, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full border border-violet/50 flex items-center justify-center"
      >
        <Wind size={24} className="text-violet" />
      </motion.div>
      <span className="font-mono text-caption uppercase tracking-wider text-fog">
        {phase === 'inhale' ? 'Inhale...' : phase === 'hold' ? 'Hold...' : 'Exhale...'}
      </span>
    </div>
  )
}

export default function OverloadOverlay() {
  const { state, resetOverload } = useCognitiveLoad()
  const [countdown, setCountdown] = useState(300)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!state.isOverloaded) {
      setCountdown(300)
      setAccepted(false)
    }
  }, [state.isOverloaded])

  useEffect(() => {
    if (!state.isOverloaded || accepted) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [state.isOverloaded, accepted])

  const handleAccept = useCallback(() => {
    setAccepted(true)
    setTimeout(() => resetOverload(), 600)
  }, [resetOverload])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <AnimatePresence>
      {state.isOverloaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(230,168,23,0.12) 0%, #000000 70%)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="glass-panel rounded-panel max-w-md w-full mx-4 p-7 text-center"
          >
            <div className="flex justify-center mb-4">
              <ShieldAlert size={40} className="text-amber" />
            </div>

            <h2 className="font-display text-4xl mb-2">
              Cognitive <span className="italic text-amber">Overload</span>
            </h2>

            <p className="text-base text-ash mb-4">
              Your Cognitive Load Index has exceeded the safe threshold. A decompression
              break is required before continuing.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {state.faultCodes.map((code) => (
                <span key={code} className="fault-code glass-panel rounded-xs px-2 py-1">
                  FAULT CODE: {code}
                </span>
              ))}
            </div>

            <div className="glass-panel rounded-panel p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart size={16} className="text-violet" />
                <span className="font-mono text-caption uppercase tracking-wider text-fog">
                  Guided Breathing
                </span>
              </div>
              <BreathingCircle />
              <div className="font-mono text-2xl text-pure">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="font-mono text-caption uppercase tracking-wider text-fog mt-1">
                Decompression Timer
              </div>
            </div>

            <button
              onClick={handleAccept}
              disabled={accepted}
              className="w-full rounded-xs px-4 py-3 font-mono text-sm uppercase tracking-wider
                bg-violet text-pure hover:bg-violet/80 transition-colors
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {accepted ? 'Resetting...' : 'Accept & Reset'}
            </button>
          </motion.div>

          {/* Fault code bar at bottom */}
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="fixed bottom-0 left-0 right-0 glass-panel border-t border-amber/20 px-4.5 py-2"
          >
            <div className="flex flex-wrap gap-4 justify-center">
              {state.faultCodes.map((code) => (
                <span key={code} className="fault-code">
                  FAULT CODE: {code}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
