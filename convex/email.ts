import { v } from "convex/values"
import { mutation, query, internalAction, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { authComponent } from "./auth"
import type { Doc } from "./_generated/dataModel"

type Frequency = Doc<"email_schedules">["frequency"]

function getNextSend(frequency: Frequency): number {
  const now = Date.now()
  switch (frequency) {
    case "hourly": return now + 60 * 60 * 1000
    case "daily": return now + 24 * 60 * 60 * 1000
    case "weekly": return now + 7 * 24 * 60 * 60 * 1000
    case "monthly": return now + 30 * 24 * 60 * 60 * 1000
    case "yearly": return now + 365 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

export const saveSchedule = mutation({
  args: {
    email: v.string(),
    frequency: v.union(
      v.literal("off"),
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
  },
  handler: async (ctx, { email, frequency }) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("email_schedules")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        frequency,
        nextSend: frequency === "off" ? undefined : getNextSend(frequency),
      })
    } else {
      await ctx.db.insert("email_schedules", {
        userId: user._id,
        email,
        frequency,
        nextSend: frequency === "off" ? undefined : getNextSend(frequency),
      })
    }
  },
})

export const getSchedule = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) return null
    return await ctx.db
      .query("email_schedules")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()
  },
})

export const sendWellnessEmail = internalAction({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error("RESEND_API_KEY not configured")

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shanti <onboarding@resend.dev>",
        to: email,
        subject: "Your wellness check-in",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="background:#0a0a0e;color:#e6e4f0;font-family:Inter,sans-serif;padding:40px 24px;">
            <div style="max-width:480px;margin:0 auto;">
              <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#e6a817,#b8860b);margin-bottom:20px;"></div>
              <h2 style="font-size:22px;font-weight:400;margin:0 0 12px;">Time for a check-in</h2>
              <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Take a moment to pause, breathe, and check in with how you're feeling. 
                Shanti is here — whenever you need it.
              </p>
              <a href="${process.env.CONVEX_SITE_URL || "http://localhost:5173"}"
                 style="display:inline-block;padding:10px 20px;border-radius:8px;border:1px solid rgba(230,168,23,0.3);color:#e6a817;text-decoration:none;font-size:13px;">
                Open Shanti
              </a>
              <p style="color:#4d4d4d;font-size:12px;border-top:1px solid #222;padding-top:16px;margin-top:24px;">
                Sent by Shanti
              </p>
            </div>
          </body>
          </html>
        `,
        text: "Time for a check-in. Take a moment to pause, breathe, and check in with how you're feeling. Open Shanti at the app to continue.",
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return { sent: true }
  },
})

export const checkAndSendDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const schedules = await ctx.db.query("email_schedules").collect()
    const now = Date.now()

    for (const schedule of schedules) {
      if (schedule.frequency === "off") continue
      if (schedule.nextSend && schedule.nextSend > now) continue

      const userId = schedule.userId
      const email = schedule.email
      if (!email) continue

      try {
        await ctx.scheduler.runAfter(0, internal.email.sendWellnessEmail, { email })
        const nextSend = getNextSend(schedule.frequency)
        await ctx.db.patch(schedule._id, {
          lastSent: now,
          nextSend,
        })
      } catch (e) {
        console.error(`Failed to send wellness email to ${email}:`, e)
      }
    }
  },
})
