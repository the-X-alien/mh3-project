import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, shell } from 'electron'
import { TabReader, TabSnapshot } from './tabReader.js'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let tabReader: TabReader | null = null
const sessionTabs: TabSnapshot[] = []

const switchTimestamps: number[] = []
let lastRapidSwitchNotif = 0
const RAPID_WINDOW_MS = 20 * 1000
const RAPID_THRESHOLD = 5
const RAPID_COOLDOWN = 30 * 1000

function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2 + 0.5
      const cy = y - size / 2 + 0.5
      const inside = Math.sqrt(cx * cx + cy * cy) < size / 2 - 1
      const i = (y * size + x) * 4
      buf[i] = 230; buf[i + 1] = 168; buf[i + 2] = 23
      buf[i + 3] = inside ? 220 : 0
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 650,
    resizable: true,
    title: 'Shanti',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow?.webContents.send('tabs:init', sessionTabs)
    mainWindow?.show()
  })
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

function buildContextMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus() }
      else createWindow()
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) },
  ])
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
    () => {},
  )
}

ipcMain.handle('tabs:get', () => sessionTabs)
ipcMain.handle('tabs:get-permission', () => true)
ipcMain.on('tabs:clear', () => {
  sessionTabs.length = 0
  mainWindow?.webContents.send('tabs:update', sessionTabs)
})
ipcMain.on('open-accessibility-prefs', () => {
  void shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  )
})

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide()

  tray = new Tray(createTrayIcon())
  tray.setToolTip('Shanti')
  tray.setContextMenu(buildContextMenu())
  tray.on('click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
    else createWindow()
  })

  createWindow()
  startTabReader()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {})

app.on('before-quit', () => {
  tabReader?.stop()
})
