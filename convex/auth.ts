import { createClient } from "@convex-dev/better-auth"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import authSchema from "./betterAuth/schema"

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth as any,
  {
    local: { schema: authSchema },
    verbose: false,
  },
)

export type Auth = typeof authComponent
