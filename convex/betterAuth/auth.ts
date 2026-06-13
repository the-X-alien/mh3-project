import { betterAuth } from "better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { createClient } from "@convex-dev/better-auth"
import { components } from "../_generated/api"
import type { GenericCtx } from "@convex-dev/better-auth"
import type { DataModel } from "../_generated/dataModel"
import authSchema from "./schema"
import authConfig from "../auth.config"

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth as any,
  {
    local: { schema: authSchema },
    verbose: false,
  },
)

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
    secret: process.env.BETTER_AUTH_SECRET || "",
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [convex({ authConfig })],
  } satisfies Parameters<typeof betterAuth>[0]
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}
