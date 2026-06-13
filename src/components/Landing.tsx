import { motion } from 'framer-motion'
import { Wind, Brain, Activity, Download, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

function InstallCommand() {
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('mac')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/win/i.test(ua)) setOs('windows')
    else if (/mac/i.test(ua)) setOs('mac')
    else setOs('linux')
  }, [])

  const commands = {
    windows: 'powershell -c "irm https://mh3-project.vercel.app/install.ps1 | iex"',
    mac: 'curl -fsSL https://mh3-project.vercel.app/install.sh | sh',
    linux: 'curl -fsSL https://mh3-project.vercel.app/install.sh | sh',
  }

  return (
    <div>
      <div className="flex justify-center gap-2 mb-4">
        {(['windows', 'mac'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setOs(p)}
            className={`px-4 py-1.5 rounded-lg font-body text-xs transition-all ${
              os === p ? 'bg-amber/10 border border-amber/30 text-amber' : 'text-fog/50 hover:text-fog border border-transparent'
            }`}
          >
            {p === 'windows' ? 'Windows' : 'macOS'}
          </button>
        ))}
      </div>
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center justify-between px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <code className="font-mono text-xs text-fog/80 select-all">
            {commands[os]}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(commands[os])}
            className="font-body text-[11px] text-amber hover:text-pure transition-colors shrink-0 ml-4"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber to-amber/60 flex items-center justify-center">
            <Wind size={14} className="text-void" />
          </div>
          <span className="font-cursive text-xl text-pure">Shanti</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/sign-in"
            className="font-body text-xs text-fog hover:text-pure transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="font-body text-xs px-4 py-2 rounded-lg bg-amber/10 border border-amber/30 text-amber hover:bg-amber/15 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-24 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8">
            <Activity size={12} className="text-green" />
            <span className="font-body text-[11px] text-fog/70">AI-powered wellness companion</span>
          </div>

          <h1 className="font-cursive text-5xl sm:text-6xl text-pure leading-tight mb-5">
            Your mindful
            <br />
            <span className="text-gradient-amber">companion</span>
          </h1>
          <p className="font-body text-base text-fog/80 leading-relaxed max-w-lg mx-auto mb-10">
            Shanti monitors your desktop activity, detects stress patterns, and guides you
            through breathing exercises — all powered by AI and beautifully private.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber/10 border border-amber/30 text-amber font-body text-sm hover:bg-amber/15 transition-colors"
            >
              Open Dashboard
              <ArrowRight size={14} />
            </Link>
            <a
              href="#install"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-fog font-body text-sm hover:text-pure transition-colors"
            >
              <Download size={14} />
              Install Desktop App
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-24 w-full max-w-3xl"
        >
          {[
            { icon: Brain, title: 'Stress Detection', desc: 'AI analyzes your desktop activity to detect stress patterns in real time.' },
            { icon: Wind, title: 'Breathing Exercises', desc: 'Guided breathing sessions trigger automatically when stress is detected.' },
            { icon: Activity, title: 'Email Check-ins', desc: 'Scheduled wellness check-ins delivered to your inbox on your terms.' },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center">
                <f.icon size={18} className="text-amber" />
              </div>
              <h3 className="font-cursive text-lg text-pure">{f.title}</h3>
              <p className="font-body text-xs text-fog/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          id="install"
          className="w-full max-w-lg mt-24"
        >
          <div className="text-center mb-6">
            <h2 className="font-cursive text-2xl text-pure mb-2">Desktop App</h2>
            <p className="font-body text-xs text-fog/70">Install Shanti on Windows or macOS for automatic stress detection.</p>
          </div>

          <InstallCommand />

          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <span className="font-body text-[11px] text-fog/60">Windows (x64)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <span className="font-body text-[11px] text-fog/60">macOS (Intel + Apple Silicon)</span>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="text-center pb-8">
        <p className="font-body text-[11px] text-fog/40">Shanti &mdash; open source and privacy-first.</p>
      </footer>
    </div>
  )
}
