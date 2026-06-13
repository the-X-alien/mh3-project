import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { authComponent } from "./auth"

export const pushTelemetry = mutation({
  args: {
    cli: v.number(),
    event: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, { cli, event, details }) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) throw new Error("Not authenticated")

    await ctx.db.insert("telemetry_events", {
      userId: user._id,
      cli,
      event,
      details,
      timestamp: Date.now(),
    })
  },
})

export const pushCliSnapshot = mutation({
  args: {
    cli: v.number(),
    taskComplexity: v.number(),
    workHours: v.number(),
    sleepHours: v.number(),
    faultCodes: v.array(v.string()),
    isOverloaded: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) throw new Error("Not authenticated")

    await ctx.db.insert("cli_snapshots", {
      userId: user._id,
      ...args,
      timestamp: Date.now(),
    })
  },
})

export const setTrustedContact = mutation({
  args: {
    email: v.string(),
    optIn: v.boolean(),
  },
  handler: async (ctx, { email, optIn }) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("trusted_contacts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { email, optIn })
    } else {
      await ctx.db.insert("trusted_contacts", {
        userId: user._id,
        email,
        optIn,
      })
    }
  },
})

export const recordNudge = mutation({
  args: {
    contactEmail: v.string(),
    cliAtNudge: v.number(),
    delivered: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx) as any
    if (!user) throw new Error("Not authenticated")

    await ctx.db.insert("nudges", {
      userId: user._id,
      ...args,
      sentAt: Date.now(),
    })
  },
})
