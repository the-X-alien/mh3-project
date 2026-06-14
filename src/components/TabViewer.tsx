import { useState, useEffect } from 'react'

interface TabSnapshot {
  timestamp: number
  browser: string
  tabTitle: string
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return `${hours}h ${rem}m`
}

function computeDuration(tabs: TabSnapshot[], index: number): string {
  if (index === 0) return `${formatDuration(Date.now() - tabs[0].timestamp)} (active)`
  return formatDuration(tabs[index - 1].timestamp - tabs[index].timestamp)
}

const BROWSER_COLORS: Record<string, string> = {
  chrome: 'text-[#4285f4]',
  firefox: 'text-[#ff7139]',
  safari: 'text-[#0fb8ff]',
  edge: 'text-[#0078d4]',
  brave: 'text-[#fb542b]',
  opera: 'text-[#ff1b2d]',
}

export default function TabViewer() {
  const [tabs, setTabs] = useState<TabSnapshot[]>([])
  const [collapsed, setCollapsed] = useState(true)
  const electron = (window as any).electronAPI as {
    getTabs: () => Promise<TabSnapshot[]>
    clearTabs: () => void
    onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void) => () => void
  } | undefined

  const isElectron = typeof electron?.getTabs === 'function'

  useEffect(() => {
    if (!isElectron) return

    electron.getTabs().then(setTabs)
    const unsub = electron.onTabsUpdate(setTabs)
    return unsub
  }, [])

  if (!isElectron) return null

  return (
    <div className="rounded-2xl bg-glass border border-white/5 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-cursive text-lg text-pure">Tab Activity</span>
          <span className="font-mono text-[11px] text-fog/50 bg-white/[0.05] px-2 py-0.5 rounded-full">
            {tabs.length}
          </span>
        </div>
        <span className={`text-fog/40 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>
          ▾
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
          {tabs.length === 0 ? (
            <p className="font-body text-xs text-fog/40 text-center py-6">
              No tabs captured yet. Switch to a browser tab to start tracking.
            </p>
          ) : (
            tabs.map((t, i) => (
              <div
                key={`${t.timestamp}-${i}`}
                className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-2.5"
              >
                <span className={`font-mono text-[10px] uppercase tracking-wider mt-0.5 ${BROWSER_COLORS[t.browser] || 'text-fog/50'}`}>
                  {t.browser}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs text-pure truncate">{t.tabTitle}</p>
                  <p className="font-mono text-[10px] text-fog/40 mt-0.5">
                    {computeDuration(tabs, i)} &middot; {formatTime(t.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          {tabs.length > 0 && (
            <button
              onClick={() => { electron.clearTabs(); setTabs([]) }}
              className="w-full font-body text-[11px] text-fog/30 hover:text-fog/60 transition-colors text-center pt-1"
            >
              Clear session
            </button>
          )}
        </div>
      )}
    </div>
  )
}
