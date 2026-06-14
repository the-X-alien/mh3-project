import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, NativeImage, shell, screen, Notification } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { TabReader, TabSnapshot } from './tabReader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray: Tray | null = null
let dashboardWindow: BrowserWindow | null = null
const tabReader = new TabReader()
const sessionTabs: TabSnapshot[] = []
let hasPermission = false

const switchTimestamps: number[] = []
let lastRapidSwitchNotif = 0
let lastActivityTime = 0
let sessionStartTime = 0
let lastBreakNotif = 0

const BREAK_INTERVAL_MS = 20 * 60 * 1000
const BREAK_RESET_MS    = 5  * 60 * 1000
const BREAK_COOLDOWN    = 10 * 60 * 1000
const RAPID_WINDOW_MS   = 60 * 1000
const RAPID_CHILL       = 7
const RAPID_ALARM       = 10
const RAPID_COOLDOWN    = 15 * 1000

let alarmActive      = false
let lastSocialVisitMs = 0
let lastAutoBreath   = 0
let stressModifier   = 0
let sleepHours       = 8
let surveyAdjustment: number | null = null

interface Contact { id: string; name: string; role: string; email: string; phone: string }
interface StressPoint { score: number; timestamp: number; factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number } }
interface LonelinessData { socialMs: number; solitaryMs: number; cli: number; faultTriggered: boolean }

const contacts: Contact[] = []
let contactIdCounter = 0
const stressHistory: StressPoint[] = []

const SOCIAL_SITES = new Set(['messages','whatsapp','discord','instagram','facetime','zoom','telegram','messenger','snapchat','signal','slack','wechat','google meet','teams','skype'])

function notify(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}

function createTrayIcon(): NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2 + 0.5
      const cy = y - size / 2 + 0.5
      const inside = Math.sqrt(cx * cx + cy * cy) < size / 2 - 1
      const i = (y * size + x) * 4
      buf[i] = 230; buf[i+1] = 168; buf[i+2] = 23
      buf[i+3] = inside ? 220 : 0
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function parseSite(title: string): string {
  const p = title.split(' - ')
  return p.length >= 2 ? p[p.length - 1].trim() : title
}

function parseTabTitle(title: string): { site: string; page: string } {
  const p = title.split(' - ')
  return p.length >= 2
    ? { site: p[p.length - 1].trim(), page: p.slice(0, -1).join(' - ').trim() }
    : { site: title, page: '' }
}

function computeLoneliness(): LonelinessData {
  const now = Date.now()
  let socialMs = 0, solitaryMs = 0
  for (let i = 0; i < sessionTabs.length; i++) {
    const ms = i === 0 ? now - sessionTabs[i].timestamp : sessionTabs[i-1].timestamp - sessionTabs[i].timestamp
    const { site } = parseTabTitle(sessionTabs[i].tabTitle)
    if (SOCIAL_SITES.has(site.toLowerCase().trim())) socialMs += ms; else solitaryMs += ms
  }
  const total = socialMs + solitaryMs
  const cli = total > 0 ? (solitaryMs / total) * 100 : 0
  const faultTriggered = solitaryMs > 3 * 3600000 && cli > 60 &&
    (lastSocialVisitMs === 0 || Date.now() - lastSocialVisitMs > 3 * 3600000)
  return { socialMs, solitaryMs, cli, faultTriggered }
}

function calculateStress(): StressPoint {
  const now = Date.now()
  let totalMs = 0
  for (let i = 0; i < sessionTabs.length; i++)
    totalMs += i === 0 ? now - sessionTabs[i].timestamp : sessionTabs[i-1].timestamp - sessionTabs[i].timestamp

  const hoursWorked   = totalMs / 3600000
  const fiveMinAgo    = now - 5 * 60 * 1000
  const recentSwitches = switchTimestamps.filter(t => t >= fiveMinAgo).length
  const switchRate    = recentSwitches / 5
  const uniqueSites   = new Set(sessionTabs.map(t => parseSite(t.tabTitle))).size

  let score = Math.min(100, Math.round(
    Math.min(hoursWorked / 12, 1) * 30 +
    Math.min(switchRate  / 8,  1) * 30 +
    Math.min(uniqueSites / 10, 1) * 20 +
    Math.max(0, (8 - sleepHours) / 8)  * 20
  ))
  if (surveyAdjustment !== null) score = Math.max(0, Math.min(100, score + surveyAdjustment))
  score = Math.max(0, Math.min(100, score + stressModifier))
  return { score, timestamp: now, factors: { hoursWorked, switchRate, uniqueSites, sleepHours } }
}

function sendStressUpdate(): void {
  const data = calculateStress()
  stressHistory.push(data)
  if (stressHistory.length > 60) stressHistory.shift()

  const loneliness = computeLoneliness()
  if (loneliness.faultTriggered) {
    dashboardWindow?.webContents.send('fault-triggered', {
      code: 'ERR_SOCIAL_DEPRIVATION',
      message: "Your battery is low and you haven't connected with anyone today. Message someone you trust.",
    })
  }

  if (dashboardWindow?.isVisible()) {
    dashboardWindow.webContents.send('stress-update', data, [...stressHistory])
    dashboardWindow.webContents.send('social-update', loneliness)
  }

  const now = Date.now()
  if (data.score > 75 && now - lastAutoBreath > 300000) {
    lastAutoBreath = now
    dashboardWindow?.webContents.send('auto-breath')
    notify('Shanti', 'Your stress is high. Take a moment to breathe.')
  }

  const tag = data.score > 70 ? 'HIGH' : data.score >= 40 ? 'MED' : 'LOW'
  tray?.setToolTip(`Shanti — Stress: ${data.score} (${tag})`)
}

let rageWindow: BrowserWindow | null = null

function openRageRoom(): void {
  if (rageWindow && !rageWindow.isDestroyed()) { rageWindow.show(); rageWindow.focus(); return }
  const size = screen.getPrimaryDisplay().workAreaSize
  rageWindow = new BrowserWindow({
    width: Math.min(700, size.width),
    height: Math.min(600, size.height),
    title: 'Rage Room',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  })
  rageWindow.loadFile(path.join(__dirname, 'renderer', 'rage-room.html'))
  rageWindow.setMenuBarVisibility(false)
  rageWindow.on('closed', () => { rageWindow = null })
}

function createDashboardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 850,
    show: false,
    frame: true,
    resizable: true,
    title: 'Shanti',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  win.on('close', (e) => { e.preventDefault(); win.hide() })
  win.on('closed', () => { dashboardWindow = null })
  return win
}

function showDashboard(): void {
  if (!dashboardWindow) {
    dashboardWindow = createDashboardWindow()
    dashboardWindow.webContents.once('did-finish-load', () => {
      dashboardWindow?.webContents.send('tabs-init', sessionTabs)
      dashboardWindow?.webContents.send('permission-status', hasPermission)
      dashboardWindow?.webContents.send('social-update', computeLoneliness())
    })
  } else {
    dashboardWindow.webContents.send('tabs-init', sessionTabs)
    dashboardWindow.webContents.send('permission-status', hasPermission)
    dashboardWindow.webContents.send('social-update', computeLoneliness())
  }
  dashboardWindow.show()
  dashboardWindow.focus()
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide()

  tray = new Tray(createTrayIcon())
  tray.setToolTip('Shanti')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: showDashboard },
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) },
  ]))
  tray.on('click', showDashboard)

  ipcMain.handle('get-tabs',             () => sessionTabs)
  ipcMain.handle('get-permission',       () => hasPermission)
  ipcMain.handle('get-stress',           () => calculateStress())
  ipcMain.handle('get-stress-history',   () => [...stressHistory])
  ipcMain.handle('get-sleep-hours',      () => sleepHours)
  ipcMain.handle('set-sleep-hours',      (_e, h: number) => { sleepHours = h })
  ipcMain.handle('get-loneliness',       () => computeLoneliness())
  ipcMain.handle('set-survey-adjustment',(_e, adj: number) => { surveyAdjustment = adj })
  ipcMain.handle('get-survey-adjustment',() => surveyAdjustment)
  ipcMain.handle('get-alarm-state',      () => alarmActive)
  ipcMain.handle('get-contacts',         () => contacts)
  ipcMain.handle('add-contact',          (_e, c: Omit<Contact,'id'>) => { contacts.push({ id: String(++contactIdCounter), ...c }) })
  ipcMain.handle('remove-contact',       (_e, id: string) => { const i = contacts.findIndex(c => c.id === id); if (i !== -1) contacts.splice(i, 1) })

  ipcMain.on('open-rage-room',         () => openRageRoom())
  ipcMain.on('clear-alarm',            () => { alarmActive = false; dashboardWindow?.webContents.send('alarm-state', false) })
  ipcMain.on('breath-complete',        () => { stressModifier = -40 })
  ipcMain.on('open-accessibility-prefs', () => {
    void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
  })
  ipcMain.on('contact-person', (_e, id: string, method: 'email' | 'sms') => {
    const c = contacts.find(ct => ct.id === id)
    if (!c) return
    if (method === 'email' && c.email) void shell.openExternal(`mailto:${c.email}`)
    else if (method === 'sms' && c.phone) void shell.openExternal(`sms:${c.phone}`)
  })
  ipcMain.on('send-message', (_e, id: string, message: string) => {
    const c = contacts.find(ct => ct.id === id)
    if (!c) return
    const body = encodeURIComponent(message)
    if (c.email) void shell.openExternal(`mailto:${c.email}?body=${body}`)
    else if (c.phone) void shell.openExternal(`sms:${c.phone}?body=${body}`)
  })

  showDashboard()
  sendStressUpdate()

  setInterval(() => {
    sendStressUpdate()
    if (stressModifier < 0) stressModifier = Math.min(0, stressModifier + 5)
    else if (stressModifier > 0) stressModifier = Math.max(0, stressModifier - 5)
  }, 30000)

  tabReader.start(
    (snapshot) => {
      const now = Date.now()
      while (switchTimestamps.length > 0 && switchTimestamps[0]! < now - RAPID_WINDOW_MS) switchTimestamps.shift()
      switchTimestamps.push(now)
      const count = switchTimestamps.length

      if (count >= RAPID_ALARM && now - lastRapidSwitchNotif > RAPID_COOLDOWN) {
        lastRapidSwitchNotif = now
        alarmActive = true
        dashboardWindow?.webContents.send('alarm-state', true)
        dashboardWindow?.webContents.send('auto-breath')
        notify('Shanti', "You're switching tabs too much! Take a breath.")
      } else if (count >= RAPID_CHILL && now - lastRapidSwitchNotif > RAPID_COOLDOWN) {
        lastRapidSwitchNotif = now
        notify('Shanti', 'Try to focus on one task.')
      }

      const { site } = parseTabTitle(snapshot.tabTitle)
      if (SOCIAL_SITES.has(site.toLowerCase().trim())) lastSocialVisitMs = Date.now()

      sessionTabs.unshift(snapshot)
      if (dashboardWindow?.isVisible()) dashboardWindow.webContents.send('tabs-update', sessionTabs)
    },
    (ok) => {
      hasPermission = ok
      dashboardWindow?.webContents.send('permission-status', ok)
    },
    () => {
      const now = Date.now()
      lastActivityTime = now
      if (sessionStartTime === 0) sessionStartTime = now
      else if (now - lastActivityTime > BREAK_RESET_MS) sessionStartTime = now
    },
  )

  setInterval(() => {
    if (sessionStartTime === 0) return
    const now = Date.now()
    if (now - lastActivityTime > BREAK_RESET_MS) { sessionStartTime = 0; return }
    if (now - sessionStartTime >= BREAK_INTERVAL_MS && now - lastBreakNotif > BREAK_COOLDOWN) {
      lastBreakNotif = now
      sessionStartTime = now
      notify('Shanti', "You've been on screen for 20 minutes. Step away for a moment!")
    }
  }, 10000)

  app.on('activate', () => { if (!dashboardWindow) showDashboard() })
})

app.on('window-all-closed', () => {})
app.on('before-quit', () => { tabReader.stop() })
