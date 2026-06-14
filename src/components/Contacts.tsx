import { motion } from 'framer-motion'
import { Phone, Shield, AlertTriangle, Heart } from 'lucide-react'
import Seo from './Seo'

const RESOURCES = [
  {
    label: '911',
    sub: 'Emergency Services',
    detail: 'Call if you or someone is in immediate danger.',
    href: 'tel:911',
    color: '#e65032',
    icon: '🚨',
  },
  {
    label: '988',
    sub: 'Suicide & Crisis Lifeline',
    detail: 'Call or text 988 — free, 24/7, confidential.',
    href: 'tel:988',
    color: '#e6a817',
    icon: '💛',
  },
  {
    label: 'NAMI Helpline',
    sub: '1-800-950-6264',
    detail: 'Mon–Fri 10am–10pm ET. Mental health info, referrals, and support.',
    href: 'tel:18009506264',
    color: '#2ecc71',
    icon: '🤝',
  },
  {
    label: 'Crisis Text Line',
    sub: 'Text HOME to 741741',
    detail: 'Free, 24/7 crisis counseling via text message.',
    href: 'sms:741741?body=HOME',
    color: '#40C4FF',
    icon: '💬',
  },
  {
    label: 'SAMHSA Helpline',
    sub: '1-800-662-4357',
    detail: 'Substance use and mental health referrals. Free, 24/7.',
    href: 'tel:18006624357',
    color: '#7C4DFF',
    icon: '🧠',
  },
  {
    label: 'Veterans Crisis Line',
    sub: '1-800-273-8255, Press 1',
    detail: 'Or text 838255. Dedicated support for US veterans.',
    href: 'tel:18002738255',
    color: '#FFB74D',
    icon: '🎖️',
  },
]

export default function Contacts() {
  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24 space-y-8">
      <Seo title="Crisis Resources & Trusted Contacts" description="Free, confidential crisis support lines including 988 Suicide & Crisis Lifeline, NAMI Helpline, Crisis Text Line, and more. You are not alone." path="/contacts" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-1">
          <Heart size={20} className="text-amber" />
          <h1 className="font-cursive text-3xl text-pure">Trusted Contacts</h1>
        </div>
        <p className="font-body text-sm text-fog/60">
          You are not alone. These lines are free, confidential, and available right now.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="p-4 rounded-xl bg-amber/5 border border-amber/20 flex items-start gap-3"
      >
        <AlertTriangle size={15} className="text-amber shrink-0 mt-0.5" />
        <p className="font-body text-xs text-fog/80 leading-relaxed">
          If you or someone you know is in immediate danger, <strong className="text-pure">call 911 now.</strong> For emotional crises, <strong className="text-pure">call or text 988</strong> — trained counselors answer 24/7.
        </p>
      </motion.div>

      <div className="flex items-center gap-2 mb-3">
        <Shield size={14} className="text-amber" />
        <span className="font-body text-xs text-fog/60 uppercase tracking-widest">Crisis & Support Lines</span>
      </div>

      <div className="space-y-3">
        {RESOURCES.map((r, i) => (
          <motion.a
            key={r.label}
            href={r.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
          >
            <span className="text-2xl shrink-0">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-cursive text-lg text-pure group-hover:text-amber transition-colors">{r.label}</span>
                <span className="font-mono text-xs" style={{ color: r.color }}>{r.sub}</span>
              </div>
              <p className="font-body text-xs text-fog/50 mt-0.5 leading-snug">{r.detail}</p>
            </div>
            <Phone size={14} className="text-fog/30 group-hover:text-amber shrink-0 transition-colors" />
          </motion.a>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <p className="font-body text-xs text-fog/40">
          All lines are free and confidential. You deserve support.
        </p>
      </motion.div>
    </div>
  )
}
