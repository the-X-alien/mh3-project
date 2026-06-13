import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  getCurrentStress: () => ipcRenderer.invoke('monitor:getCurrentStress'),
  setLoginItem: (open: boolean) => ipcRenderer.invoke('monitor:setLoginItem', open),
  getLoginItem: () => ipcRenderer.invoke('monitor:getLoginItem'),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  onStressUpdate: (cb: (analysis: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on('monitor:stress', handler)
    return () => ipcRenderer.removeListener('monitor:stress', handler)
  },

  onActivityUpdate: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on('monitor:activity', handler)
    return () => ipcRenderer.removeListener('monitor:activity', handler)
  },

  onUpdateStatus: (cb: (status: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },

  getTabs: () => ipcRenderer.invoke('tabs:get'),
  clearTabs: () => ipcRenderer.send('tabs:clear'),

  onTabsUpdate: (cb: (tabs: any[]) => void) => {
    const handler = (_: any, data: any[]) => cb(data)
    ipcRenderer.on('tabs:update', handler)
    return () => ipcRenderer.removeListener('tabs:update', handler)
  },

  onTabsPermission: (cb: (ok: boolean) => void) => {
    const handler = (_: any, data: boolean) => cb(data)
    ipcRenderer.on('tabs:permission', handler)
    return () => ipcRenderer.removeListener('tabs:permission', handler)
  },
})
