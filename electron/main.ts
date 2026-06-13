import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, Notification, dialog } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { ActivityMonitor, StressAnalysis } from './monitor.js'
import { TabReader, TabSnapshot } from './tabReader.js'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let monitor: ActivityMonitor | null = null
let tabReader: TabReader | null = null
const sessionTabs: TabSnapshot[] = []

// ── Rapid switch detection ──
const switchTimestamps: number[] = []
let lastRapidSwitchNotif = 0

// ── Screen-time tracking ──
let lastActivityTime = 0
let sessionStartTime = 0
let lastBreakNotif = 0
const BREAK_INTERVAL_MS = 20 * 60 * 1000
const BREAK_RESET_MS = 5 * 60 * 1000
const RAPID_WINDOW_MS = 20 * 1000
const RAPID_THRESHOLD = 5
const RAPID_COOLDOWN = 30 * 1000
const BREAK_COOLDOWN = 10 * 60 * 1000

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function sendUpdateStatus(status: string, data?: any) {
  mainWindow?.webContents.send('update:status', { status, data })
}

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'))
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', { version: info.version, releaseDate: info.releaseDate })
  })
  autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available'))
  autoUpdater.on('error', (err) => sendUpdateStatus('error', { message: err.message }))
  autoUpdater.on('download-progress', (p) => sendUpdateStatus('downloading', { percent: p.percent, bytesPerSecond: p.bytesPerSecond, total: p.total, transferred: p.transferred }))
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', { version: info.version })
  })
}

function createTrayIcon(stress?: StressAnalysis | null) {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)

  let r = 100, g = 100, b = 100
  if (stress) {
    if (stress.label === 'stressed') { r = 230; g = 80; b = 50 }
    else if (stress.label === 'tense') { r = 230; g = 168; b = 23 }
    else { r = 46; g = 204; b = 113 }
  } else {
    r = 230; g = 168; b = 23
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - size / 2
      const dy = y - size / 2
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < size / 2 - 1) {
        canvas[i] = r; canvas[i + 1] = g; canvas[i + 2] = b; canvas[i + 3] = 255
      } else {
        canvas[i + 3] = 0
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function updateTray(stress?: StressAnalysis | null) {
  if (!tray) return
  tray.setImage(createTrayIcon(stress))

  let statusLabel = 'Starting...'
  let statusColor = '#999'
  if (stress) {
    statusLabel = `${stress.label.toUpperCase()} (${stress.score})`
    statusColor = stress.label === 'stressed' ? '#e65032' : stress.label === 'tense' ? '#e6a817' : '#2ecc71'
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Status: ${statusLabel}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Dashboard',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus() }
        else createWindow()
      },
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])
  tray.setContextMenu(contextMenu)
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(900, height),
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Shanti')
  updateTray()

  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
    else createWindow()
  })
}

function startMonitor() {
  monitor = new ActivityMonitor()

  monitor.on('activity', (data) => {
    mainWindow?.webContents.send('monitor:activity', data)
  })

  monitor.on('stress', (analysis: StressAnalysis) => {
    updateTray(analysis)
    mainWindow?.webContents.send('monitor:stress', analysis)

    if (analysis.label === 'stressed' && mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  monitor.start()
}

function startTabReader() {
  tabReader = new TabReader()

  tabReader.start(
    (snapshot) => {
      const now = Date.now()
      switchTimestamps.push(now)
      const cutoff = now - RAPID_WINDOW_MS
      while (switchTimestamps.length > 0 && switchTimestamps[0]! < cutoff) {
        switchTimestamps.shift()
      }
      if (switchTimestamps.length >= RAPID_THRESHOLD && now - lastRapidSwitchNotif > RAPID_COOLDOWN) {
        lastRapidSwitchNotif = now
        new Notification({
          title: 'Shanti',
          body: "You're switching tabs rapidly — try to focus on one task.",
        }).show()
      }

      sessionTabs.unshift(snapshot)
      mainWindow?.webContents.send('tabs:update', sessionTabs)
    },
    (ok) => {
      mainWindow?.webContents.send('tabs:permission', ok)
    },
    () => {
      const now = Date.now()
      lastActivityTime = now
      if (sessionStartTime === 0) {
        sessionStartTime = now
      } else if (now - lastActivityTime > BREAK_RESET_MS) {
        sessionStartTime = now
      }
    },
  )
}

ipcMain.handle('tabs:get', () => sessionTabs)
ipcMain.on('tabs:clear', () => {
  sessionTabs.length = 0
  mainWindow?.webContents.send('tabs:update', sessionTabs)
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.hide())
ipcMain.handle('monitor:getCurrentStress', () => monitor?.currentStress ?? null)
ipcMain.handle('monitor:setLoginItem', (_, openAtLogin: boolean) => {
  app.setLoginItemSettings({ openAtLogin })
  return app.getLoginItemSettings().openAtLogin
})
ipcMain.handle('monitor:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('update:check', () => {
  if (!isDev) autoUpdater.checkForUpdates()
  else sendUpdateStatus('not-available')
})
ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())
ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true })
  createTray()
  createWindow()
  startMonitor()
  startTabReader()
  if (!isDev) setupAutoUpdater()

  // ── Periodic break reminders (every 10s) ──
  setInterval(() => {
    if (sessionStartTime === 0) return
    const now = Date.now()
    if (now - lastActivityTime > BREAK_RESET_MS) {
      sessionStartTime = 0
      return
    }
    const elapsed = now - sessionStartTime
    if (elapsed >= BREAK_INTERVAL_MS && now - lastBreakNotif > BREAK_COOLDOWN) {
      lastBreakNotif = now
      sessionStartTime = now
      new Notification({
        title: 'Time for a break!',
        body: "You've been using the screen for 20 minutes straight. Step away for a moment!",
      }).show()
    }
  }, 10000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  monitor?.stop()
  tabReader?.stop()
})
