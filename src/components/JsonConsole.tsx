import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import { cn } from '@/lib/utils'

export default function JsonConsole({ className }: { className?: string }) {
  const { state } = useCognitiveLoad()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.telemetryLog.length])

  return (
    <div className={cn('border-t border-graphite', className)}>
      <div className="px-3 py-1.5">
        <span className="font-mono text-caption uppercase tracking-wider text-fog">
          Live Telemetry Console
        </span>
      </div>
      <pre className="font-mono text-caption leading-relaxed overflow-y-auto max-h-[160px] px-3 pb-3 text-ash">
        {state.telemetryLog.length === 0 && (
          <span className="text-fog">// Waiting for events... Start typing or switch tabs.</span>
        )}
        {state.telemetryLog.map((entry, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="block"
          >
            {JSON.stringify(entry, null, 2)}
            {i < state.telemetryLog.length - 1 ? ',' : ''}
          </motion.span>
        ))}
        <div ref={bottomRef} />
      </pre>
    </div>
  )
}
