import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, LineChart, Wind, Settings, LogOut, Sun, Moon, Loader2 } from 'lucide-react'
import { useAuth } from './AuthProvider'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: LineChart },
  { to: '/breathe', label: 'Breathe', icon: Wind },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function NavBar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('shanti-theme') !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('shanti-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md bg-void/70 border-b border-white/[0.06]">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none" role="img" aria-label="Shanti">🙏</span>
          <span className="font-cursive text-xl text-pure hidden sm:inline">Shanti</span>
        </div>

        <div className="flex items-center gap-0.5 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-amber/10 text-amber' : 'text-fog hover:text-pure'
                }`
              }
            >
              <l.icon size={14} />
              <span className="hidden sm:inline">{l.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-fog hover:text-pure transition-colors"
          >
            <motion.span
              key={dark ? 'moon' : 'sun'}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="block"
            >
              {dark ? <Moon size={15} /> : <Sun size={15} />}
            </motion.span>
          </button>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-fog hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
          >
            {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
