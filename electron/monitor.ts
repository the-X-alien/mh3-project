import { execSync } from 'child_process'
import { EventEmitter } from 'events'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type ActivityEvent = {
  timestamp: number
  windowTitle: string
  processName: string
  idleSeconds: number
}

export type StressAnalysis = {
  score: number
  label: 'calm' | 'tense' | 'stressed'
  reason: string
  windowActivity: string
}

const HACK_CLUB_AI = 'https://ai.hackclub.com/proxy/v1/chat/completions'
const HC_KEY = process.env.HACK_CLUB_AI_KEY || ''
const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemma-4-26b-a4b-it:free'

function getActiveWindow(): { title: string; process: string } {
  try {
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ActiveWin {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out int pid);
}
"@
$hwnd = [ActiveWin]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[ActiveWin]::GetWindowText($hwnd, $sb, 256)
$title = $sb.ToString()
$pid = 0
[ActiveWin]::GetWindowThreadProcessId($hwnd, [ref]$pid)
$proc = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
Write-Output "$title|||$proc"
`
    const raw = execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim()
    const [title = '', process = ''] = raw.split('|||')
    return { title: title.trim(), process: process.trim() }
  } catch {
    return { title: '', process: '' }
  }
}

function getIdleSeconds(): number {
  try {
    const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Idle {
    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
}
"@
$li = New-Object Idle+LASTINPUTINFO
$li.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($li)
[Idle]::GetLastInputInfo([ref]$li)
$ticks = [Environment]::TickCount
$idle = ($ticks - $li.dwTime) / 1000
Write-Output $idle
`
    const escaped = ps.replace(/"/g, '\\"')
    const out = execSync(`powershell -NoProfile -Command "${escaped}"`, {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim()
    return Math.round(parseFloat(out) || 0)
  } catch {
    return 0
  }
}

export class ActivityMonitor extends EventEmitter {
  private interval: ReturnType<typeof setInterval> | null = null
  private analysisInterval: ReturnType<typeof setInterval> | null = null
  private events: ActivityEvent[] = []
  private lastWindow = ''
  private switchCount = 0
  private _currentStress: StressAnalysis | null = null
  private _running = false

  get currentStress() { return this._currentStress }
  get running() { return this._running }

  start() {
    if (this._running) return
    this._running = true

    this.interval = setInterval(() => {
      const { title, process } = getActiveWindow()
      const idle = getIdleSeconds()

      if (title && title !== this.lastWindow) {
        this.switchCount++
      }
      this.lastWindow = title

      this.events.push({ timestamp: Date.now(), windowTitle: title, processName: process, idleSeconds: idle })
      if (this.events.length > 60) this.events.shift()

      this.emit('activity', { title, process, idle, switchCount: this.switchCount, totalEvents: this.events.length })
    }, 2000)

    this.analysisInterval = setInterval(() => {
      this.runAnalysis()
    }, 30000)

    this.runAnalysis()
  }

  stop() {
    this._running = false
    if (this.interval) clearInterval(this.interval)
    if (this.analysisInterval) clearInterval(this.analysisInterval)
    this.interval = null
    this.analysisInterval = null
  }

  private async runAnalysis() {
    const snapshot = [...this.events]
    if (snapshot.length < 3) return

    const windowTimeline = snapshot.map(e =>
      `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.windowTitle || '(no title)'} (${e.processName || '?'}) idle:${e.idleSeconds}s`
    ).join('\n')

    const prompt = `You are a wellness AI that analyzes computer activity to detect stress. Analyze this activity log and respond with a JSON object only (no markdown, no backticks).

Rules:
- score: 0-100 (0=completely calm, 100=extremely stressed)
- label: "calm" if score < 30, "tense" if 30-59, "stressed" if 60+
- reason: one short sentence explaining the analysis
- windowActivity: one short sentence describing what the user appears to be doing

Stress indicators: frequent window switches, long idle periods, working late, browser tabs, intense typing.

Activity log (last 2 minutes):
${windowTimeline}`

    try {
      const result = await this.callAI(prompt)
      if (result) {
        this._currentStress = result
        this.emit('stress', result)
      }
    } catch (e) {
      console.error('AI analysis failed:', e)
    }
  }

  private async callAI(prompt: string): Promise<StressAnalysis | null> {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    for (const [url, key] of [[HACK_CLUB_AI, HC_KEY], [OPENROUTER, '']] as const) {
      try {
        const h = { ...headers, ...(key ? { Authorization: `Bearer ${key}` } : {}), 'HTTP-Referer': 'https://mental-tachometer.app' }
        const res = await fetch(url, { method: 'POST', headers: h, body, signal: AbortSignal.timeout(10000) })
        if (!res.ok) continue
        const data = await res.json() as any
        const text = data.choices?.[0]?.message?.content
        if (!text) continue
        const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (typeof parsed.score === 'number' && parsed.label && parsed.reason) {
          return { score: Math.round(Math.min(100, Math.max(0, parsed.score))), label: parsed.label, reason: parsed.reason, windowActivity: parsed.windowActivity || '' }
        }
      } catch { continue }
    }
    return null
  }
}
