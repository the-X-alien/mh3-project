import { execSync, execFile } from 'child_process'

export interface TabSnapshot {
  timestamp: number
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'brave' | 'opera' | 'other'
  tabTitle: string
}

type BrowserName = TabSnapshot['browser']

const BROWSER_MAP: Record<string, BrowserName> = {
  'google chrome': 'chrome',
  chrome: 'chrome',
  chromium: 'chrome',
  brave: 'brave',
  firefox: 'firefox',
  'mozilla firefox': 'firefox',
  safari: 'safari',
  'microsoft edge': 'edge',
  msedge: 'edge',
  opera: 'opera',
}

function detectBrowser(ownerName: string): BrowserName | null {
  const lower = ownerName.toLowerCase()
  for (const [key, value] of Object.entries(BROWSER_MAP)) {
    if (lower.includes(key)) return value
  }
  return null
}

function extractTabTitle(windowTitle: string): string {
  const patterns: RegExp[] = [
    /(?: - Google Chrome(?: - .+)?)$/,
    /(?: — Mozilla Firefox(?: - .+)?)$/,
    /(?: - Mozilla Firefox(?: - .+)?)$/,
    /(?: - Safari(?: - .+)?)$/,
    /(?: - Microsoft Edge(?: - .+)?)$/,
    /(?: - Brave(?: - .+)?)$/,
    /(?: - Opera(?: - .+)?)$/,
  ]

  let result = windowTitle.trim()
  let changed = true
  while (changed) {
    changed = false
    for (const pattern of patterns) {
      const match = result.match(pattern)
      if (match) {
        result = result.slice(0, -match[0].length).trim()
        changed = true
        break
      }
    }
  }

  if (result !== windowTitle.trim()) return result

  const lastDash = result.lastIndexOf(' - ')
  if (lastDash !== -1) {
    return result.slice(0, lastDash).trim()
  }
  return result
}

function getActiveWindowMacOS(): Promise<{ owner: string; title: string } | null> {
  const script = `
tell application "System Events"
  set frontProcess to first application process whose frontmost is true
  set appName to name of frontProcess
  try
    set winTitle to title of first window of frontProcess
  on error
    set winTitle to ""
  end try
end tell
return appName & "|||" & winTitle
`
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve(null)
        return
      }
      const parts = stdout.trim().split('|||')
      if (parts.length !== 2) {
        resolve(null)
        return
      }
      resolve({ owner: parts[0], title: parts[1] })
    })
  })
}

function getActiveWindowWindows(): { owner: string; title: string } {
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
    const raw = execSync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 3000 },
    ).trim()
    const [title = '', proc = ''] = raw.split('|||')
    return { owner: proc.trim(), title: title.trim() }
  } catch {
    return { owner: '', title: '' }
  }
}

function getActiveWindowLinux(): { owner: string; title: string } {
  try {
    const raw = execSync(
      `xdotool getactivewindow getwindowname 2>/dev/null; xdotool getactivewindow getwindowpid 2>/dev/null`,
      { encoding: 'utf-8', timeout: 3000 },
    ).trim()
    const lines = raw.split('\n')
    const title = lines[0] || ''
    const pid = lines[1] || ''
    if (!title) return { owner: '', title: '' }
    let proc = ''
    if (pid) {
      try {
        proc = execSync(`ps -p ${pid.trim()} -o comm= 2>/dev/null`, {
          encoding: 'utf-8',
          timeout: 2000,
        }).trim()
      } catch {}
    }
    return { owner: proc, title }
  } catch {
    return { owner: '', title: '' }
  }
}

export type TabUpdateCallback = (snapshot: TabSnapshot) => void
export type PermissionCallback = (ok: boolean) => void
export type ActivityCallback = () => void

export class TabReader {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastTitle = ''
  private permissionOk = false
  private platform: NodeJS.Platform

  constructor() {
    this.platform = process.platform
  }

  start(
    onTab: TabUpdateCallback,
    onPermission: PermissionCallback,
    onActivity: ActivityCallback,
    pollMs = 2000,
  ): void {
    const poll = async (): Promise<void> => {
      try {
        let owner: string
        let title: string

        if (this.platform === 'darwin') {
          const win = await getActiveWindowMacOS()
          if (!win) {
            if (this.permissionOk) {
              this.permissionOk = false
              onPermission(false)
            }
            return
          }
          owner = win.owner
          title = win.title
        } else if (this.platform === 'win32') {
          const win = getActiveWindowWindows()
          owner = win.owner
          title = win.title
        } else {
          const win = getActiveWindowLinux()
          owner = win.owner
          title = win.title
        }

        if (!owner) {
          if (this.permissionOk) {
            this.permissionOk = false
            onPermission(false)
          }
          return
        }

        if (!this.permissionOk) {
          this.permissionOk = true
          onPermission(true)
        }

        if (!title) return

        const browser = detectBrowser(owner)
        if (!browser) return

        onActivity()

        const tabTitle = extractTabTitle(title)
        if (!tabTitle || tabTitle === this.lastTitle) return
        this.lastTitle = tabTitle

        onTab({ timestamp: Date.now(), browser: browser, tabTitle })
      } catch {
        if (this.permissionOk) {
          this.permissionOk = false
          onPermission(false)
        }
      }
    }

    void poll()
    this.intervalId = setInterval(() => void poll(), pollMs)
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
