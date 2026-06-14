import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, LogOut, Loader2, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import ScheduleSettings from './ScheduleSettings'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/')
  }

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pt-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <h1 className="font-cursive text-3xl text-pure">Settings</h1>
        <p className="font-body text-sm text-fog">Manage your account and check-ins</p>
      </motion.header>

      {/* Account */}
      <div className="rounded-2xl bg-glass border border-white/5 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <User size={18} className="text-amber" />
          <h2 className="font-cursive text-xl text-pure">Account</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail size={14} className="text-fog/50 shrink-0" />
            <div className="min-w-0">
              <p className="font-body text-[10px] text-fog/50 uppercase tracking-wide">Email</p>
              <p className="font-body text-sm text-pure truncate">{user?.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-fog/50 shrink-0" />
            <div className="min-w-0">
              <p className="font-body text-[10px] text-fog/50 uppercase tracking-wide">Member since</p>
              <p className="font-body text-sm text-pure">{joined}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Email schedule */}
      <div className="rounded-2xl bg-glass border border-white/5 p-5">
        <ScheduleSettings />
      </div>

      {/* Sign out */}
      <div className="rounded-2xl bg-glass border border-white/5 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-sm text-pure">Sign out</p>
          <p className="font-body text-xs text-fog/60">End your session on this device.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-500/15 transition-colors disabled:opacity-40 shrink-0"
        >
          {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          Sign Out
        </motion.button>
      </div>
    </div>
  )
}
