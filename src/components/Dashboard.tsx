import { motion } from 'framer-motion'
import { Wind, Brain, Sparkles, Activity, Download, Loader2, LineChart, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWellness } from '@/context/WellnessContext'
import { useAuth } from './AuthProvider'
import { logWellnessEvent } from '@/lib/wellness'
import AiInsights from './AiInsights'
import TabViewer from './TabViewer'
import { useState, useEffect } from 'react'

function UpdateManager() {
  const [updateStatus, setUpdateStatus] = useState<{ status: string; data?: any } | null>(null)
  const [checking, setChecking] = useState(false)

  const electron = typeof window !== 'undefined' ? (window as any).electronAPI as {
    onUpdateStatus: (cb: (s: any) => void) => () => void
    checkForUpdates: () => Promise<void>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
  } | undefined : undefined

  useEffect(() => {
    if (!electron) return
    const unsub = electron.onUpdateStatus(setUpdateStatus)
    return unsub
  }, [])

  if (!electron) return null

  const handleCheck = async () => {
    setChecking(true)
    await electron.checkForUpdates()
    setChecking(false)
  }

  const handleDownload = () => electron.downloadUpdate()
  const handleInstall = () => electron.installUpdate()

  const statusText = updateStatus?.status === 'available' ? `v${updateStatus.data?.version} available`
    : updateStatus?.status === 'downloading' ? `Downloading ${Math.round(updateStatus.data?.percent || 0)}%`
    : updateStatus?.status === 'downloaded' ? 'Ready to install'
    : updateStatus?.status === 'error' ? 'Update failed'
    : updateStatus?.status === 'checking' ? 'Checking...'
    : null

  return (
    <div className="flex items-center justify-between rounded-xl bg-glass border border-white/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <Download size={14} className="text-fog/50" />
        <span className="font-body text-xs text-fog/60">
          {statusText || 'Up to date'}
        </span>
        {updateStatus?.status === 'downloading' && (
          <Loader2 size={12} className="animate-spin text-amber" />
        )}
      </div>
      <div className="flex gap-2">
        {updateStatus?.status === 'available' && (
          <button onClick={handleDownload} className="font-body text-[11px] text-amber hover:text-pure transition-colors">
            Download
          </button>
        )}
        {updateStatus?.status === 'downloaded' && (
          <button onClick={handleInstall} className="font-body text-[11px] text-green hover:text-pure transition-colors">
            Install & Restart
          </button>
        )}
        {(!updateStatus || updateStatus.status === 'not-available' || updateStatus.status === 'error') && (
          <button onClick={handleCheck} disabled={checking} className="font-body text-[11px] text-fog/50 hover:text-pure transition-colors disabled:opacity-30">
            {checking ? <Loader2 size={12} className="animate-spin" /> : 'Check for Updates'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { state, startBreathing, addCheckIn, resetSession } = useWellness()
  const { user } = useAuth()

  const stressColor = state.stress < 30 ? 'text-green' : state.stress < 60 ? 'text-amber' : 'text-amber'

  const handleBreathe = () => {
    startBreathing()
    addCheckIn()
    if (user) void logWellnessEvent(user.id, 'breathing', state.stress, { source: 'dashboard' })
  }

  const handleReset = () => {
    if (user) void logWellnessEvent(user.id, 'reset', state.stress)
    resetSession()
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto pt-8">
      <header className="text-center space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-cursive text-3xl text-pure"
        >
          How are you feeling?
        </motion.h1>
        <p className="font-body text-sm text-fog">Take a moment to check in with yourself</p>
      </header>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-28 h-28 rounded-full bg-glass border border-white/5 flex items-center justify-center"
          >
            <Brain size={44} className="text-pure/60" />
          </motion.div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-glass border border-white/5 flex items-center justify-center">
            <Activity size={16} className={stressColor} />
          </div>
        </div>
        <div className="text-center">
          <p className={`font-cursive text-2xl ${stressColor} transition-colors duration-700`}>
            {state.stress === 0 ? 'At ease' : state.stress < 30 ? 'Calm' : state.stress < 60 ? 'Tense' : 'Stressed'}
          </p>
          <p className="font-mono text-caption text-fog/50 mt-0.5">
            {state.sessionCount} sessions &middot; {state.checkIns} check-ins
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleBreathe}
          className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl bg-glass border border-white/5 hover:border-amber/20 transition-all group"
        >
          <Wind size={22} className="text-amber group-hover:scale-110 transition-transform" />
          <span className="font-body text-xs text-fog">Breathe</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleReset}
          className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl bg-glass border border-white/5 hover:border-white/10 transition-all group"
        >
          <Sparkles size={22} className="text-fog group-hover:text-pure transition-colors" />
          <span className="font-body text-xs text-fog">Reset</span>
        </motion.button>
      </div>

      <AiInsights />

      <TabViewer />

      <UpdateManager />

      <Link
        to="/history"
        className="flex items-center justify-between rounded-2xl bg-glass border border-white/5 px-5 py-4 hover:border-amber/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <LineChart size={18} className="text-amber" />
          <div>
            <p className="font-body text-sm text-pure">View your history</p>
            <p className="font-body text-xs text-fog/60">See stress trends over time</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-fog/40 group-hover:text-amber group-hover:translate-x-0.5 transition-all" />
      </Link>

      <div className="rounded-2xl bg-glass border border-white/5 p-5 space-y-3">
        <h3 className="font-cursive text-lg text-pure">Session Activity</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Tab Switches', value: state.tabSwitches, color: 'text-fog' },
            { label: 'Idle Events', value: state.idleEvents, color: 'text-fog' },
            { label: 'Typing Spikes', value: state.typingSpikes, color: state.typingSpikes > 3 ? 'text-amber' : 'text-fog' },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="font-mono text-lg text-pure">{s.value}</p>
              <p className="font-body text-[10px] text-fog/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
