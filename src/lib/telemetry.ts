import { useEffect, useRef, useCallback } from 'react'

export type TelemetryEvent = {
  timestamp: string
  event: string
  details: Record<string, number | string>
  cli_impact: string
}

type TelemetryCallback = (event: TelemetryEvent) => void

export function useVisibilityTracking(onEvent: TelemetryCallback) {
  const countRef = useRef(0)
  const lastTimeRef = useRef(Date.now())

  useEffect(() => {
    const handler = () => {
      if (document.hidden) return
      countRef.current++
      const now = Date.now()
      const elapsed = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now
      onEvent({
        timestamp: new Date().toISOString(),
        event: 'tab_switch',
        details: { count: countRef.current, lastDuration: Math.round(elapsed * 10) / 10 },
        cli_impact: '+2%',
      })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [onEvent])
}

export function useDeleteSpike(onEvent: TelemetryCallback, onSpike: () => void) {
  const eventsRef = useRef<{ time: number; isDelete: boolean }[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isDelete = e.key === 'Backspace' || e.key === 'Delete'
      eventsRef.current.push({ time: Date.now(), isDelete })

      const cutoff = Date.now() - 30000
      eventsRef.current = eventsRef.current.filter((ev) => ev.time > cutoff)

      const total = eventsRef.current.length
      if (total < 5) return
      const deletes = eventsRef.current.filter((ev) => ev.isDelete).length
      const ratio = deletes / total

      if (ratio > 0.25) {
        onEvent({
          timestamp: new Date().toISOString(),
          event: 'delete_spike',
          details: { ratio: Math.round(ratio * 100) / 100, deletes, total },
          cli_impact: '+10%',
        })
        onSpike()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEvent, onSpike])
}

export function useIdleDetection(onEvent: TelemetryCallback, onIdle: () => void) {
  const idleRef = useRef(0)

  const reset = useCallback(() => {
    idleRef.current = 0
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      idleRef.current += 5
      if (idleRef.current >= 20) {
        onEvent({
          timestamp: new Date().toISOString(),
          event: 'idle_detected',
          details: { idleSeconds: idleRef.current },
          cli_impact: '+3%',
        })
        onIdle()
        idleRef.current = 0
      }
    }, 5000)

    const activity = () => reset()
    window.addEventListener('mousemove', activity)
    window.addEventListener('keydown', activity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', activity)
      window.removeEventListener('keydown', activity)
    }
  }, [onEvent, onIdle, reset])
}
