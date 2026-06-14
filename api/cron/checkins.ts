// Vercel Cron function — sends due scheduled check-in emails.
// Scheduled hourly via vercel.json "crons".
// Requires env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
//   VITE_SUPABASE_URL (or SUPABASE_URL), optional CRON_SECRET, RESEND_FROM.
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { checkinHtml } from '../send-checkin'

export const config = { runtime: 'nodejs' }

type Frequency = 'off' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export default async function handler(req: any, res: any) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!url || !serviceKey || !resendKey) {
    return res.status(500).json({ error: 'Missing RESEND/SUPABASE env vars' })
  }

  const supabase = createClient(url, serviceKey)
  const resend = new Resend(resendKey)
  const now = new Date()

  const { data: due, error } = await supabase
    .from('email_schedules')
    .select('*')
    .neq('frequency', 'off')
    .or(`next_send.is.null,next_send.lte.${now.toISOString()}`)

  if (error) return res.status(500).json({ error: error.message })

  let sent = 0
  const failures: string[] = []

  for (const s of due ?? []) {
    try {
      const { error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM || 'Shanti <onboarding@resend.dev>',
        to: s.email,
        subject: 'Your Shanti wellness check-in 🙏',
        html: checkinHtml(),
      })
      if (sendErr) { failures.push(`${s.email}: ${sendErr.message}`); continue }

      await supabase
        .from('email_schedules')
        .update({ last_sent: now.toISOString(), next_send: computeNext(s.frequency, now).toISOString() })
        .eq('id', s.id)
      sent++
    } catch (e: any) {
      failures.push(`${s.email}: ${e?.message || 'send failed'}`)
    }
  }

  return res.status(200).json({ ok: true, sent, failures })
}

function computeNext(freq: Frequency, from: Date): Date {
  const d = new Date(from)
  switch (freq) {
    case 'hourly':  d.setHours(d.getHours() + 1); break
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
    default:        d.setDate(d.getDate() + 1)
  }
  return d
}
