import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MessageCircle } from 'lucide-react'

const QA_ITEMS = [
  {
    q: 'What is the Cognitive Load Index (CLI)?',
    a: 'The CLI is Shanti\'s stress score from 0–100. It\'s computed locally on your device using four signals: hours of screen time today, how fast you switch between tabs (switches per minute), the number of unique websites visited, and last night\'s sleep hours. No AI or server is involved — the formula runs entirely on your machine.',
  },
  {
    q: 'Is my data private? What gets sent to the server?',
    a: 'Your tab titles and browsing data never leave your device. The only things sent to Shanti\'s backend are: your stress score (a number 0–100), your self-reported sleep hours, and scheduled wellness check-in emails if you opt in. All data is stored in a Supabase PostgreSQL database tied to your account. You can delete your account and all associated data at any time from Settings.',
  },
  {
    q: 'How does the breathing exercise trigger?',
    a: 'When your CLI score exceeds 70 for more than 5 consecutive minutes, Shanti automatically shows a breathing overlay in the desktop app. It guides you through a 25-second box-breathing cycle (inhale 4s, hold 4s, exhale 4s, hold 4s). You can also dismiss it at any time.',
  },
  {
    q: 'What is the Rage Room?',
    a: 'The Rage Room is a click-to-break stress relief tool in the desktop app. It shows a themed room (living room, kitchen, office, bedroom, garden) with clickable objects. Each click plays a satisfying break animation. When you reset, the scene changes to a different room. It\'s a healthy outlet for frustration — no judgment.',
  },
  {
    q: 'What are Social Signal and the loneliness index?',
    a: 'Shanti classifies your browser tabs into "social" (Gmail, Slack, iMessage web, social media with active posting) and "solitary" (YouTube, news, docs, solo tools). It tracks the ratio over your session. If solitary time exceeds 60% for extended periods, the Social Signal card turns yellow or red and may trigger a nudge to reach out to someone.',
  },
  {
    q: 'How do wellness email check-ins work?',
    a: 'If you configure a schedule in Settings, Shanti sends you a short wellness email via Resend at your chosen times. The email summarizes your average CLI for the day and includes a one-click check-in link where you can log how you\'re feeling. These are powered by a cron job at cron-job.org hitting the /api/cron/checkins endpoint.',
  },
  {
    q: 'Does Shanti work without the desktop app?',
    a: 'Yes — the website dashboard shows your historical stress trends, wellness log, and settings. However, real-time tab tracking and the breathing alarm require the desktop app, which uses macOS Accessibility APIs (AppleScript) or Windows APIs to read your active browser tab.',
  },
  {
    q: 'How do I get the desktop app?',
    a: 'Run the one-line install command from the homepage. On macOS: curl -fsSL https://mh3-project.vercel.app/install.sh | sh. On Windows: powershell -c "irm https://mh3-project.vercel.app/install.ps1 | iex". This clones the repo, builds the Electron app from source, and adds it to your Applications / Start Menu.',
  },
  {
    q: 'I\'m in crisis. What should I do?',
    a: 'Please reach out immediately. Call or text 988 (Suicide & Crisis Lifeline, free, 24/7). If there is immediate danger, call 911. You can also call the NAMI Helpline at 1-800-950-6264 (Mon–Fri, 10am–10pm ET) for non-emergency mental health support. Your Trusted Contacts page has quick-dial links.',
  },
  {
    q: 'Can I contribute to or audit the code?',
    a: 'Yes — Shanti is fully open source at github.com/the-X-alien/mh3-project. The desktop app is in /tabdashboardv2 (Electron + TypeScript), the website is in /src (React + Vite + Tailwind), and the API routes are in /api (serverless functions on Vercel). PRs and issues are welcome.',
  },
]

function Item({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.04 }}
      className="border-b border-white/[0.06] last:border-0"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-body text-sm text-pure">{q}</span>
        <ChevronDown
          size={15}
          className={`text-fog/40 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="font-body text-sm text-fog/70 leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function QA() {
  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24 space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={18} className="text-amber" />
          <h1 className="font-cursive text-3xl text-pure">Questions & Answers</h1>
        </div>
        <p className="font-body text-sm text-fog/60">Everything you wanted to know about how Shanti works.</p>
      </motion.div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6">
        {QA_ITEMS.map((item, i) => (
          <Item key={i} q={item.q} a={item.a} i={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="font-body text-xs text-fog/40">
          More questions?{' '}
          <a
            href="https://github.com/the-X-alien/mh3-project/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber hover:text-pure transition-colors"
          >
            Open an issue on GitHub →
          </a>
        </p>
      </motion.div>
    </div>
  )
}
