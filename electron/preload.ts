import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tabDashboard', {
  getTabs: (): Promise<any[]> => ipcRenderer.invoke('tabs:get'),
  getPermission: (): Promise<boolean> => ipcRenderer.invoke('tabs:get-permission'),
  clearTabs: (): void => { ipcRenderer.send('tabs:clear') },
  openAccessibilityPrefs: (): void => { ipcRenderer.send('open-accessibility-prefs') },

  onTabsUpdate: (cb: (tabs: any[]) => void): (() => void) => {
    const handler = (_: any, tabs: any[]) => cb(tabs)
    ipcRenderer.on('tabs:update', handler)
    return () => ipcRenderer.removeListener('tabs:update', handler)
  },

  onTabsInit: (cb: (tabs: any[]) => void): void => {
    ipcRenderer.once('tabs:init', (_: any, tabs: any[]) => cb(tabs))
  },

  onPermissionStatus: (cb: (ok: boolean) => void): void => {
    ipcRenderer.on('tabs:permission', (_: any, ok: boolean) => cb(ok))
  },
})
