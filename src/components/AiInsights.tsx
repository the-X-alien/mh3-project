import { useEffect, useState } from 'react'
import { Cpu, Activity, Monitor } from 'lucide-react'
import { useWellness } from '@/context/WellnessContext'

interface StressAnalysis {
  score: number
  label: 'calm' | 'tense' | 'stressed'
  reason: string
  windowActivity: string
}

interface ActivityData {
  title: string
  process: string
  idle: number
  switchCount: number
  totalEvents: number
}

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  data?: { version?: string; releaseDate?: string; percent?: number; bytesPerSecond?: number; total?: number; transferred?: number; message?: string }
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window
}

function getElectronAPI() {
  if (isElectron()) return (window as any).electronAPI as {
    getCurrentStress: () => Promise<StressAnalysis | null>
    onStressUpdate: (cb: (a: StressAnalysis) => void) => () => void
    onActivityUpdate: (cb: (d: ActivityData) => void) => () => void
    onUpdateStatus: (cb: (s: UpdateStatus) => void) => () => void
    checkForUpdates: () => Promise<void>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
  }
  return null
}

export default function AiInsights() {
  const { state, startBreathing } = useWellness()
  const [stress, setStress] = useState<StressAnalysis | null>(null)
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [aiSyncing, setAiSyncing] = useState(false)

  useEffect(() => {
    const api = getElectronAPI()
    if (!api) {
      setAiSyncing(false)
      return
    }
    setAiSyncing(true)
    api.getCurrentStress().then(setStress)
    const unsubStress = api.onStressUpdate(setStress)
    const unsubActivity = api.onActivityUpdate(setActivity)
    return () => { unsubStress(); unsubActivity() }
  }, [])

  useEffect(() => {
    if (!stress || !isElectron()) return
    const mapped = stress.score < 30 ? 'calm' : stress.score < 60 ? 'tense' : 'stressed'
    const wellnessScore = stress.score
  }, [stress])

  if (!isElectron()) return null

  const s = stress
  const scoreColor = !s ? 'text-fog' : s.label === 'stressed' ? 'text-amber' : s.label === 'tense' ? 'text-amber/70' : 'text-green'
  const bgColor = !s ? 'border-white/5' : s.label === 'stressed' ? 'border-amber/30' : s.label === 'tense' ? 'border-amber/15' : 'border-green/20'

  return (
    <div className={`rounded-2xl bg-glass border ${bgColor} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-fog" />
          <h3 className="font-cursive text-lg text-pure">AI Monitor</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${aiSyncing ? 'bg-emerald' : 'bg-fog/30'}`} />
          <span className="font-mono text-[10px] text-fog/50">{aiSyncing ? 'live' : 'browser mode'}</span>
        </div>
      </div>

      {s ? (
        <>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`text-3xl font-cursive ${scoreColor}`}>{s.score}</div>
              <div className="font-body text-[10px] text-fog/60 mt-0.5">{s.label.toUpperCase()}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs text-fog leading-relaxed">{s.reason}</p>
            </div>
          </div>

          {s.windowActivity && (
            <div className="flex items-start gap-2 pt-2 border-t border-white/5">
              <Monitor size={12} className="text-fog/40 mt-0.5 shrink-0" />
              <p className="font-body text-[11px] text-fog/60 leading-relaxed">{s.windowActivity}</p>
            </div>
          )}

          {activity && (
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <Activity size={12} className="text-fog/40 shrink-0" />
              <div className="flex gap-3 text-[10px] font-mono text-fog/50">
                <span>{activity.switchCount} switches</span>
                <span>{Math.round(activity.idle)}s idle</span>
                <span>{activity.process || '?'}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="font-body text-xs text-fog/40">Waiting for activity data...</p>
      )}
    </div>
  )
}
