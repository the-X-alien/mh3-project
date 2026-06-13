import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import TelemetryEngine from './TelemetryEngine'
import TaskSandbox from './TaskSandbox'
import OverloadOverlay from './OverloadOverlay'
import TrustedContact from './TrustedContact'
import NavPill from './NavPill'
import { staggerContainer } from '@/lib/animations'

export default function Dashboard() {
  const { state } = useCognitiveLoad()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contact'>('dashboard')

  return (
    <>
      <NavPill activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={`min-h-screen transition-all duration-800 ${
          state.isOverloaded ? 'overload-bg' : ''
        }`}
      >
        <div className="flex flex-col md:flex-row min-h-screen">
          {/* Left Pane — Telemetry Engine */}
          <div className="md:w-1/2 border-r-0 md:border-r border-graphite flex flex-col relative">
            <div className="flex-1">
              <TelemetryEngine />
            </div>
            <AnimatePresence>
              {activeTab === 'contact' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <TrustedContact />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Pane — Task Sandbox */}
          <div className="md:w-1/2 flex flex-col relative">
            <TaskSandbox />
          </div>
        </div>
      </motion.main>

      <OverloadOverlay />
    </>
  )
}
