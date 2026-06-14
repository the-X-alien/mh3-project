import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Check } from 'lucide-react'
import { useWellness, EmailFrequency } from '@/context/WellnessContext'

const frequencies: { value: EmailFrequency; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'No emails' },
  { value: 'hourly', label: 'Hourly', desc: 'Every 60 minutes' },
  { value: 'daily', label: 'Daily', desc: 'Once per day' },
  { value: 'weekly', label: 'Weekly', desc: 'Once per week' },
  { value: 'monthly', label: 'Monthly', desc: 'Once per month' },
  { value: 'yearly', label: 'Yearly', desc: 'Once per year' },
]

const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export default function ScheduleSettings() {
  const { state, dispatch } = useWellness()
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSendTest = async () => {
    if (!emailValid(state.email)) return
    setTestStatus('sending')
    setTestMsg('')
    try {
      const res = await fetch('/api/send-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          name: (user?.user_metadata?.name as string) || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTestStatus('error')
        setTestMsg(data.error || 'Could not send. Is Resend configured?')
        return
      }
      setTestStatus('sent')
      setTestMsg('Check-in sent — look in your inbox.')
    } catch {
      setTestStatus('error')
      setTestMsg('Network error sending the test email.')
    } finally {
      setTimeout(() => setTestStatus('idle'), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-fog" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock size={18} className="text-amber" />
        <h2 className="font-cursive text-xl text-pure">Check-in Schedule</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {frequencies.map((f) => {
          const isActive = state.emailFrequency === f.value
          return (
            <motion.button
              key={f.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => dispatch({ type: 'SET_FREQUENCY', value: f.value })}
              type="button"
              className={`relative px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                isActive
                  ? 'bg-amber/10 border border-amber/40 shadow-[0_0_15px_rgba(230,168,23,0.15)]'
                  : 'bg-glass border border-white/5 hover:border-white/10'
              }`}
            >
              <p className={`font-body text-sm mb-0.5 ${isActive ? 'text-pure' : 'text-fog'}`}>{f.label}</p>
              <p className="font-mono text-[10px] text-fog/60">{f.desc}</p>
            </motion.button>
          )
        })}
      </div>

      <div>
        <label className="block font-body text-xs text-fog mb-1.5">Send check-ins to</label>
        <input
          type="email"
          value={state.email}
          onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 rounded-xl bg-glass border border-white/5 text-pure font-body text-sm placeholder:text-fog/30 outline-none focus:border-amber/40 transition-colors"
        />
        {state.email && !emailValid(state.email) && (
          <p className="mt-1.5 font-body text-[11px] text-amber/80">Enter a valid email address.</p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={!state.email}
        className="w-full py-2.5 rounded-xl bg-amber/10 border border-amber/30 text-amber font-body text-sm hover:bg-amber/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saved ? <Check size={14} /> : null}
        {saved ? 'Saved' : 'Save Schedule'}
      </motion.button>
    </div>
  )
}
