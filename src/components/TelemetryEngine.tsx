import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Activity } from 'lucide-react'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import { useVisibilityTracking, useDeleteSpike, useIdleDetection } from '@/lib/telemetry'
import { fadeUp, staggerContainer } from '@/lib/animations'
import JsonConsole from './JsonConsole'

export default function TelemetryEngine() {
  const { addTelemetryEvent, handleTabSwitch, handleDeleteSpike, handleIdle, state } = useCognitiveLoad()
  const [text, setText] = useState('')

  const onEvent = useCallback(
    (event: any) => addTelemetryEvent(event),
    [addTelemetryEvent]
  )

  useVisibilityTracking(
    useCallback(
      (event) => {
        onEvent(event)
        handleTabSwitch()
      },
      [onEvent, handleTabSwitch]
    )
  )

  useDeleteSpike(
    useCallback((event) => onEvent(event), [onEvent]),
    useCallback(() => handleDeleteSpike(true), [handleDeleteSpike])
  )

  useIdleDetection(
    useCallback((event) => onEvent(event), [onEvent]),
    useCallback(() => handleIdle(), [handleIdle])
  )

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="px-4.5 pt-4.5 pb-3">
        <motion.div variants={fadeUp} className="flex items-center gap-1.5 mb-3">
          <Terminal size={14} className="text-violet" />
          <span className="font-mono text-caption uppercase tracking-wider text-fog">
            Passive Telemetry Engine
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-fog" />
            <span className="font-mono text-caption uppercase text-fog">Tab Switches</span>
            <span className="font-mono text-sm text-pure">{state.tabSwitchCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-caption uppercase text-fog">Delete Spike</span>
            <span
              className={`inline-block w-2 h-2 rounded-pill ${state.deleteSpikeActive ? 'bg-amber' : 'bg-fog'}`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-caption uppercase text-fog">Idle Events</span>
            <span className="font-mono text-sm text-pure">{state.idleCount}</span>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <textarea
            value={text}
            onChange={handleTextChange}
            disabled={state.isOverloaded}
            placeholder={state.isOverloaded ? '[EDITOR LOCKED — CRITICAL OVERLOAD]' : 'Start typing to generate telemetry...'}
            className="glass-editor w-full h-[240px] resize-none rounded-panel p-4 font-body text-base text-pure placeholder-fog outline-none transition-colors focus:border-violet disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </motion.div>
      </div>

      <div className="mt-auto">
        <JsonConsole />
      </div>
    </motion.div>
  )
}
