import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { LineChart, Activity, Wind, RotateCcw, Loader2, Calendar } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { fetchTelemetry, type TelemetryEvent } from '@/lib/wellness'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const EVENT_META: Record<string, { label: string; icon: typeof Wind; color: string }> = {
  breathing: { label: 'Breathing session', icon: Wind, color: 'text-amber' },
  check_in: { label: 'Check-in', icon: Activity, color: 'text-green' },
  reset: { label: 'Session reset', icon: RotateCcw, color: 'text-fog' },
  stress_reading: { label: 'Stress reading', icon: Activity, color: 'text-fog' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export default function History() {
  const { user } = useAuth()
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchTelemetry(user.id).then((data) => {
      setEvents(data)
      setLoading(false)
    })
  }, [user])

  const withCli = events.filter((e) => typeof e.cli === 'number')
  const avgStress = withCli.length
    ? Math.round(withCli.reduce((s, e) => s + (e.cli ?? 0), 0) / withCli.length)
    : 0
  const breathingCount = events.filter((e) => e.event === 'breathing').length
  const lastCheckIn = events[0] ? timeAgo(events[0].timestamp) : '—'

  // Oldest → newest for the chart
  const chartSource = [...withCli].reverse().slice(-30)
  const chartData = {
    labels: chartSource.map((e) =>
      new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    ),
    datasets: [
      {
        data: chartSource.map((e) => e.cli ?? 0),
        borderColor: '#e6a817',
        backgroundColor: 'rgba(230,168,23,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  }
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' as const } },
    scales: {
      y: { min: 0, max: 100, ticks: { color: '#999', stepSize: 25 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#999', maxTicksLimit: 6 }, grid: { display: false } },
    },
  }

  const stats = [
    { label: 'Avg Stress', value: String(avgStress), icon: Activity },
    { label: 'Sessions', value: String(breathingCount), icon: Wind },
    { label: 'Events', value: String(events.length), icon: Calendar },
    { label: 'Last', value: lastCheckIn, icon: LineChart },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pt-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <h1 className="font-cursive text-3xl text-pure">Your wellness history</h1>
        <p className="font-body text-sm text-fog">Trends from your check-ins over time</p>
      </motion.header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-amber" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-glass border border-white/5 p-10 text-center space-y-2">
          <LineChart size={28} className="text-fog/40 mx-auto" />
          <p className="font-body text-sm text-fog">No history yet.</p>
          <p className="font-body text-xs text-fog/60">
            Take a breathing session on the dashboard and your wellness trends will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-glass border border-white/5 p-3 text-center">
                <s.icon size={14} className="text-amber mx-auto mb-1.5" />
                <p className="font-mono text-sm text-pure truncate">{s.value}</p>
                <p className="font-body text-[10px] text-fog/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-glass border border-white/5 p-5">
            <h3 className="font-cursive text-lg text-pure mb-4">Stress over time</h3>
            <div className="h-48">
              {chartSource.length >= 2 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="font-body text-xs text-fog/50">Need a few more check-ins to chart a trend.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-glass border border-white/5 p-5 space-y-3">
            <h3 className="font-cursive text-lg text-pure">Recent activity</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {events.slice(0, 50).map((e) => {
                const meta = EVENT_META[e.event] ?? { label: e.event, icon: Activity, color: 'text-fog' }
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-2.5"
                  >
                    <meta.icon size={15} className={`${meta.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-pure">{meta.label}</p>
                      <p className="font-mono text-[10px] text-fog/40">{timeAgo(e.timestamp)}</p>
                    </div>
                    {typeof e.cli === 'number' && (
                      <span className="font-mono text-xs text-amber shrink-0">{Math.round(e.cli)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
