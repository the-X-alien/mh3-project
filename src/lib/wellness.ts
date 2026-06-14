import { supabase } from './supabase'

export type WellnessEventType = 'check_in' | 'breathing' | 'reset' | 'stress_reading'

export interface TelemetryEvent {
  id: string
  user_id: string
  cli: number | null
  event: string
  details: Record<string, unknown> | null
  timestamp: string
}

/** Record a wellness event for the signed-in user. timestamp defaults to now() in the DB. */
export async function logWellnessEvent(
  userId: string,
  event: WellnessEventType,
  cli: number,
  details?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('telemetry_events').insert({
    user_id: userId,
    event,
    cli: Math.round(cli * 100) / 100,
    details: details ?? null,
  })
  if (error) console.error('logWellnessEvent failed:', error.message)
}

/** Fetch the user's recent telemetry, newest first. */
export async function fetchTelemetry(userId: string, limit = 200): Promise<TelemetryEvent[]> {
  const { data, error } = await supabase
    .from('telemetry_events')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('fetchTelemetry failed:', error.message)
    return []
  }
  return (data ?? []) as TelemetryEvent[]
}
