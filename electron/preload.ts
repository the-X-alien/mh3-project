import { contextBridge, ipcRenderer } from 'electron'
import type { TabSnapshot } from './tabReader.js'

interface StressPoint {
  score: number
  timestamp: number
  factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number }
}
interface LonelinessData { socialMs: number; solitaryMs: number; cli: number; faultTriggered: boolean }
interface FaultData { code: string; message: string }
interface Contact { id: string; name: string; role: string; email: string; phone: string }

contextBridge.exposeInMainWorld('tabDashboard', {
  // Tabs
  getTabs:               (): Promise<TabSnapshot[]>  => ipcRenderer.invoke('get-tabs'),
  getPermission:         (): Promise<boolean>        => ipcRenderer.invoke('get-permission'),
  openAccessibilityPrefs:(): void                    => { ipcRenderer.send('open-accessibility-prefs') },
  onTabsUpdate:  (cb: (tabs: TabSnapshot[]) => void): void => { ipcRenderer.on('tabs-update',  (_e, t) => cb(t)) },
  onTabsInit:    (cb: (tabs: TabSnapshot[]) => void): void => { ipcRenderer.on('tabs-init',    (_e, t) => cb(t)) },
  onPermissionStatus: (cb: (ok: boolean) => void):   void => { ipcRenderer.on('permission-status', (_e, ok) => cb(ok)) },

  // Stress
  getStress:        (): Promise<StressPoint>   => ipcRenderer.invoke('get-stress'),
  getStressHistory: (): Promise<StressPoint[]> => ipcRenderer.invoke('get-stress-history'),
  getSleepHours:    (): Promise<number>        => ipcRenderer.invoke('get-sleep-hours'),
  setSleepHours:    (h: number): Promise<void> => ipcRenderer.invoke('set-sleep-hours', h),
  onStressUpdate: (cb: (data: StressPoint, history: StressPoint[]) => void): void => {
    ipcRenderer.on('stress-update', (_e, data, history) => cb(data, history))
  },

  // Loneliness
  getLoneliness:  (): Promise<LonelinessData>              => ipcRenderer.invoke('get-loneliness'),
  onSocialUpdate: (cb: (data: LonelinessData) => void): void => { ipcRenderer.on('social-update', (_e, d) => cb(d)) },

  // Fault codes
  onFaultTriggered: (cb: (fault: FaultData) => void): void => { ipcRenderer.on('fault-triggered', (_e, f) => cb(f)) },

  // Auto-breath
  onAutoBreath: (cb: () => void): void => { ipcRenderer.on('auto-breath', () => cb()) },

  // Survey
  setSurveyAdjustment: (adj: number): Promise<void>     => ipcRenderer.invoke('set-survey-adjustment', adj),
  getSurveyAdjustment: (): Promise<number | null>        => ipcRenderer.invoke('get-survey-adjustment'),

  // Rage Room
  openRageRoom: (): void => { ipcRenderer.send('open-rage-room') },

  // Alarm / breathing
  getAlarmState: (): Promise<boolean>              => ipcRenderer.invoke('get-alarm-state'),
  clearAlarm:    (): void                          => { ipcRenderer.send('clear-alarm') },
  onAlarmState:  (cb: (active: boolean) => void): void => { ipcRenderer.on('alarm-state', (_e, a) => cb(a)) },
  breathComplete:(): void                          => { ipcRenderer.send('breath-complete') },

  // Contacts
  getContacts:   (): Promise<Contact[]>                        => ipcRenderer.invoke('get-contacts'),
  addContact:    (c: Omit<Contact,'id'>): Promise<void>        => ipcRenderer.invoke('add-contact', c),
  removeContact: (id: string): Promise<void>                   => ipcRenderer.invoke('remove-contact', id),
  contactPerson: (id: string, method: 'email' | 'sms'): void  => { ipcRenderer.send('contact-person', id, method) },
  sendMessage:   (id: string, message: string): void           => { ipcRenderer.send('send-message', id, message) },
})
