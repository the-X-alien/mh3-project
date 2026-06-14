// Vercel serverless function — send a single wellness check-in email via Resend.
// POST { email: string, name?: string }
// Requires env: RESEND_API_KEY (and optional RESEND_FROM).
import { Resend } from 'resend'

export const config = { runtime: 'nodejs' }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  const email = body?.email
  const name = body?.name
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'A valid email is required' })
  }

  const resend = new Resend(apiKey)
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Shanti <onboarding@resend.dev>',
      to: email,
      subject: 'Your Shanti wellness check-in 🙏',
      html: checkinHtml(name),
    })
    if (error) return res.status(502).json({ error: error.message })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to send email' })
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s) } catch { return null }
}

export function checkinHtml(name?: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,'
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#000;color:#fff;border-radius:16px">
    <div style="font-size:28px;text-align:center;margin-bottom:8px">🙏</div>
    <h1 style="font-family:'Dancing Script',cursive;font-size:26px;text-align:center;margin:0 0 16px;color:#fff">Shanti</h1>
    <p style="color:#999;font-size:14px;line-height:1.6">${greeting}</p>
    <p style="color:#999;font-size:14px;line-height:1.6">
      This is your scheduled wellness check-in. Take a slow breath in for four counts, hold for two,
      and release for six. How are you feeling right now?
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="https://mh3-project.vercel.app/dashboard"
         style="display:inline-block;padding:12px 28px;border-radius:999px;background:rgba(230,168,23,0.12);
                border:1px solid rgba(230,168,23,0.4);color:#e6a817;text-decoration:none;font-size:14px">
        Open your dashboard
      </a>
    </div>
    <p style="color:#555;font-size:11px;text-align:center;margin-top:24px">
      You're receiving this because you set up check-ins in Shanti. Change the frequency anytime in Settings.
    </p>
  </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
