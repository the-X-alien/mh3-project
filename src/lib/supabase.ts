import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type DbEmailFrequency = 'off' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface EmailSchedule {
  id: string
  user_id: string
  email: string
  frequency: DbEmailFrequency
  last_sent: string | null
  next_send: string | null
  created_at: string
  updated_at: string
}
