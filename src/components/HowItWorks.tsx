import { motion } from 'framer-motion'
import { Database, Code2, Eye, Mail, Cpu, Globe, Lock, GitBranch } from 'lucide-react'

const SECTIONS = [
  {
    icon: Cpu,
    title: 'Cognitive Load Index',
    body: `The CLI is a stress score from 0 to 100 computed entirely on your device — no AI, no server call. It combines four signals:

• Screen time (hours active today) — longer sessions push the score up
• Tab switch rate (switches per minute) — rapid context-switching signals cognitive overload
• Unique websites visited — more domains = more mental context switches
• Sleep hours (self-reported via the sleep slider) — less sleep amplifies all other signals

The formula weights sleep most heavily because sleep deprivation multiplies every other stressor. The score updates every 30 seconds.`,
  },
  {
    icon: Eye,
    title: 'Tab Tracking (macOS)',
    body: `The desktop app uses AppleScript via osascript to ask Chrome, Safari, Firefox, and Edge for their active tab title every few seconds. No content is read — only the tab title (e.g. "GitHub - Settings").

On macOS, this requires Accessibility permission (System Settings → Privacy & Security → Accessibility). The app prompts you once and remembers. On Windows, it uses the Windows Accessibility API instead.

Tab titles are stored in memory only for the duration of your session and are never sent to any server.`,
  },
  {
    icon: Database,
    title: 'PostgreSQL / Supabase',
    body: `Shanti uses Supabase (hosted PostgreSQL) for three tables:

• users — Better Auth managed accounts, email + hashed password
• wellness_logs — timestamped CLI scores, sleep hours, session metadata
• checkin_responses — responses to email wellness check-ins

The schema is fully open source in /supabase/migrations. Row-level security ensures you can only read your own rows. The Supabase project is hosted in us-east-1. You can request a full export or deletion of your data at any time via Settings → Delete Account.`,
  },
  {
    icon: Mail,
    title: 'Wellness Email Check-ins',
    body: `If you enable email check-ins in Settings, Shanti sends a daily wellness email via Resend (a transactional email API). The email includes:

• Your average CLI score for the day
• A one-click "I'm doing well" / "Struggling today" response link
• Links to breathing exercises and crisis resources

The cron trigger is hosted on cron-job.org (free tier), which calls GET /api/cron/checkins with a CRON_SECRET header. Vercel's free plan only allows one cron per day, so we moved this externally. The API route is at /api/cron/checkins.ts in the repo.`,
  },
  {
    icon: Globe,
    title: 'Website & API',
    body: `The website is a React 18 + Vite + TypeScript app deployed on Vercel. It uses:

• React Router for client-side routing (/dashboard, /history, /breathe, /settings, /contacts, /qa, /how-it-works)
• Tailwind CSS for styling with a custom design system (black, amber #e6a817, Playfair Display, Space Mono, Inter)
• Better Auth for session management (JWT in HttpOnly cookies)
• Serverless API routes in /api/ for webhooks, cron, and data access

The Vercel project auto-deploys from the main branch of github.com/the-X-alien/mh3-project.`,
  },
  {
    icon: Code2,
    title: 'Desktop App Architecture',
    body: `The desktop app lives in /tabdashboardv2 and is built with Electron + TypeScript. Key files:

• src/main/index.ts — Electron main process: tray icon, IPC handlers, tab polling, stress calculation
• src/main/monitor.ts — OS-level tab reading via AppleScript / Windows APIs
• src/renderer/index.html — the app window UI (plain HTML + TypeScript, no framework)
• src/renderer/dashboard.ts — renderer logic: stress ring, tab list, donut chart, breathing overlay
• src/renderer/rage-room.html / rage-room.ts — the breakable objects stress relief tool

The tray icon is a 🙏 emoji rendered into a 16×16 pixel buffer with a color underline (green / amber / red) indicating your current stress level. No native dependencies — built entirely with Node.js buffers and Electron's nativeImage API.`,
  },
  {
    icon: Lock,
    title: 'Privacy Policy',
    body: `Shanti is built privacy-first:

• Tab titles never leave your device
• Browsing history is never stored anywhere
• CLI scores are only stored if you have an account and are signed in
• Email addresses are used only for wellness check-ins you explicitly enable
• No analytics, no third-party trackers, no ad networks
• The entire codebase is open source — you can audit every line

We do not sell, share, or monetize your data in any way. The project is a mental health tool, not a data business.`,
  },
  {
    icon: GitBranch,
    title: 'Repo Structure',
    body: `github.com/the-X-alien/mh3-project

/tabdashboardv2    — Electron desktop app (main focus)
  /src/main        — Electron main process
  /src/renderer    — App window (HTML/TS/CSS)
/src               — React website
  /components      — All page and UI components
  /context         — WellnessContext (shared state)
  /lib             — API helpers, wellness logging
/api               — Vercel serverless functions
  /cron            — Email check-in cron handler
/public            — install.sh + install.ps1 scripts
/supabase          — DB migrations

To run locally: clone the repo, cd tabdashboardv2, npm install && npm run build && npx electron .
For the website: npm install && npm run dev from the root.`,
  },
]

export default function HowItWorks() {
  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24 space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-cursive text-3xl text-pure mb-1">How It All Works</h1>
        <p className="font-body text-sm text-fog/60">
          A full technical walkthrough — the database, the desktop app, the telemetry, and the privacy model.
        </p>
      </motion.div>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center shrink-0">
                <s.icon size={15} className="text-amber" />
              </div>
              <h2 className="font-cursive text-xl text-pure">{s.title}</h2>
            </div>
            <div className="space-y-2">
              {s.body.split('\n\n').map((para, j) => (
                <p key={j} className="font-body text-sm text-fog/70 leading-relaxed whitespace-pre-line">{para}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center space-y-2"
      >
        <p className="font-body text-xs text-fog/40">Shanti is open source and always will be.</p>
        <a
          href="https://github.com/the-X-alien/mh3-project"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-body text-xs text-amber hover:text-pure transition-colors"
        >
          View source on GitHub →
        </a>
      </motion.div>
    </div>
  )
}
