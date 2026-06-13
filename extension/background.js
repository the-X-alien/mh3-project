// Mental Tachometer — Background Service Worker
// Monitors the user throughout the day, computes Cognitive Load Index (CLI).

const STATE = {
  cli: 0,
  tabSwitchCount: 0,
  deleteSpikeActive: false,
  idleMinutes: 0,
  totalKeystrokes: 0,
  deleteKeystrokes: 0,
  isOverloaded: false,
  sessionStart: Date.now(),
  lastActivity: Date.now(),
  lastTabSwitch: Date.now(),
  deleteWindow: [],
  dailyCheckIns: [],
  trustedContact: null,
  contactOptIn: false,
  notificationSentToday: false,
  overloadTriggered: false,
}

const CLI_DEFAULTS = {
  taskComplexity: 5,
  workHours: 4,
  sleepHours: 7,
}

// ─── Persistence ────────────────────────────────────────────────

async function loadState() {
  try {
    const data = await chrome.storage.local.get([
      'state', 'cliDefaults', 'trustedContact', 'contactOptIn',
      'dailyCheckIns', 'notificationSentToday', 'sessionStart',
    ])
    if (data.state) Object.assign(STATE, data.state)
    if (data.cliDefaults) Object.assign(CLI_DEFAULTS, data.cliDefaults)
    if (data.trustedContact !== undefined) STATE.trustedContact = data.trustedContact
    if (data.contactOptIn !== undefined) STATE.contactOptIn = data.contactOptIn
    if (data.dailyCheckIns) STATE.dailyCheckIns = data.dailyCheckIns
    if (data.notificationSentToday !== undefined) STATE.notificationSentToday = data.notificationSentToday
    if (data.sessionStart) STATE.sessionStart = data.sessionStart
  } catch (e) {
    // First run — use defaults
  }
}

async function saveState() {
  await chrome.storage.local.set({
    state: {
      cli: STATE.cli,
      tabSwitchCount: STATE.tabSwitchCount,
      deleteSpikeActive: STATE.deleteSpikeActive,
      idleMinutes: STATE.idleMinutes,
      totalKeystrokes: STATE.totalKeystrokes,
      deleteKeystrokes: STATE.deleteKeystrokes,
      isOverloaded: STATE.isOverloaded,
      lastActivity: STATE.lastActivity,
      lastTabSwitch: STATE.lastTabSwitch,
      sessionStart: STATE.sessionStart,
      overloadTriggered: STATE.overloadTriggered,
    },
    cliDefaults: CLI_DEFAULTS,
    trustedContact: STATE.trustedContact,
    contactOptIn: STATE.contactOptIn,
    dailyCheckIns: STATE.dailyCheckIns,
    notificationSentToday: STATE.notificationSentToday,
    sessionStart: STATE.sessionStart,
  })
}

// ─── CLI Computation ────────────────────────────────────────────

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

function computeCLI() {
  const base = CLI_DEFAULTS.sleepHours === 0
    ? 100
    : (CLI_DEFAULTS.taskComplexity * CLI_DEFAULTS.workHours) / CLI_DEFAULTS.sleepHours * 6

  let penalty = 0
  penalty += STATE.tabSwitchCount * 5
  if (STATE.deleteSpikeActive) penalty += 10
  penalty += STATE.idleMinutes * 0.5

  STATE.cli = clamp(Math.round(base + penalty), 0, 100)

  // Overflow detection
  if (STATE.cli > 75 && !STATE.overloadTriggered) {
    STATE.overloadTriggered = true
    STATE.isOverloaded = true
    triggerOverload()
  } else if (STATE.cli <= 75) {
    STATE.isOverloaded = false
  }

  saveState()
  broadcastUpdate()
  return STATE.cli
}

// ─── Tab Switch Tracking ────────────────────────────────────────

function trackTabSwitch(tabId) {
  STATE.tabSwitchCount++
  STATE.lastTabSwitch = Date.now()
  STATE.lastActivity = Date.now()

  // Update session duration
  const sessionMinutes = (Date.now() - STATE.sessionStart) / 60000
  if (sessionMinutes > 60) {
    // New session after 1hr idle
    STATE.sessionStart = Date.now()
    STATE.tabSwitchCount = 0
  }
}

// ─── Delete Spike Detection ─────────────────────────────────────

function recordKeystroke(isDelete) {
  STATE.totalKeystrokes++
  STATE.lastActivity = Date.now()

  if (isDelete) {
    STATE.deleteKeystrokes++
    STATE.deleteWindow.push({ time: Date.now(), isDelete: true })
  } else {
    STATE.deleteWindow.push({ time: Date.now(), isDelete: false })
  }

  // Keep rolling 30-second window
  const cutoff = Date.now() - 30000
  STATE.deleteWindow = STATE.deleteWindow.filter(e => e.time > cutoff)

  if (STATE.deleteWindow.length >= 10) {
    const deletes = STATE.deleteWindow.filter(e => e.isDelete).length
    const ratio = deletes / STATE.deleteWindow.length
    STATE.deleteSpikeActive = ratio > 0.25
  }
}

// ─── Idle Tracking ──────────────────────────────────────────────

function checkIdleState(idleState) {
  if (idleState === 'idle' || idleState === 'locked') {
    STATE.idleMinutes += 1
  } else if (idleState === 'active') {
    STATE.lastActivity = Date.now()
  }
  computeCLI()
}

// ─── Overload Trigger ───────────────────────────────────────────

async function triggerOverload() {
  // Create notification
  await chrome.notifications.create('cognitive-overload', {
    type: 'basic',
    iconUrl: 'icons/icon.svg',
    title: 'Cognitive Overload Detected',
    message: `Your CLI is ${STATE.cli}%. Time for a decompression break.`,
    priority: 2,
    requireInteraction: true,
  })

  // Try to open side panel or popup
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id })
    } catch {
      // Side panel not supported (Firefox) — open overlay tab
      await chrome.tabs.create({ url: 'overlay/index.html', active: true })
    }
  }
}

// ─── Notification to Popup ──────────────────────────────────────

function broadcastUpdate() {
  chrome.runtime.sendMessage({
    type: 'state-update',
    state: {
      cli: STATE.cli,
      tabSwitchCount: STATE.tabSwitchCount,
      deleteSpikeActive: STATE.deleteSpikeActive,
      idleMinutes: STATE.idleMinutes,
      totalKeystrokes: STATE.totalKeystrokes,
      isOverloaded: STATE.isOverloaded,
      overloadTriggered: STATE.overloadTriggered,
      trustedContact: STATE.trustedContact,
      contactOptIn: STATE.contactOptIn,
    },
  }).catch(() => {}) // Popup may not be open
}

// ─── Daily Check-in ─────────────────────────────────────────────

async function handleCheckIn() {
  const today = new Date().toISOString().split('T')[0]
  const lastCheckIn = STATE.dailyCheckIns[STATE.dailyCheckIns.length - 1]

  if (lastCheckIn !== today) {
    STATE.dailyCheckIns.push(today)
    // Keep last 30 days
    if (STATE.dailyCheckIns.length > 30) STATE.dailyCheckIns.shift()
  }

  await saveState()

  // If overloaded and opt-in, send nudge
  if (STATE.isOverloaded && STATE.contactOptIn && STATE.trustedContact && !STATE.notificationSentToday) {
    STATE.notificationSentToday = true
    await saveState()

    // Reset daily at midnight
    chrome.alarms.create('reset-daily', { when: getNextMidnight() })

    // Try to send email via API
    try {
      await fetch('https://mh3-project.vercel.app/api/send-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: STATE.trustedContact,
          status: 'red',
        }),
      })
    } catch {
      // Silent fail — notification was already shown
    }

    // Show in-browser notification
    await chrome.notifications.create('nudge-sent', {
      type: 'basic',
      iconUrl: 'icons/icon.svg',
      title: 'Nudge Sent',
      message: `Your trusted contact (${STATE.trustedContact}) has been notified with a red light.`,
      priority: 1,
    })
  }
}

function getNextMidnight() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ─── Message Handler ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'keystroke':
      recordKeystroke(msg.isDelete)
      computeCLI()
      sendResponse({ cli: STATE.cli })
      break

    case 'tab-switch':
      trackTabSwitch(msg.tabId)
      computeCLI()
      sendResponse({ cli: STATE.cli })
      break

    case 'get-state':
      sendResponse({
        state: { ...STATE },
        cliDefaults: { ...CLI_DEFAULTS },
      })
      break

    case 'check-in':
      handleCheckIn().then(() => sendResponse({ ok: true }))
      return true

    case 'set-settings':
      if (msg.trustedContact !== undefined) STATE.trustedContact = msg.trustedContact
      if (msg.contactOptIn !== undefined) STATE.contactOptIn = msg.contactOptIn
      if (msg.taskComplexity !== undefined) CLI_DEFAULTS.taskComplexity = msg.taskComplexity
      if (msg.workHours !== undefined) CLI_DEFAULTS.workHours = msg.workHours
      if (msg.sleepHours !== undefined) CLI_DEFAULTS.sleepHours = msg.sleepHours
      saveState()
      computeCLI()
      sendResponse({ ok: true })
      break

    case 'reset-overload':
      STATE.overloadTriggered = false
      STATE.isOverloaded = false
      STATE.cli = 0
      STATE.tabSwitchCount = 0
      STATE.deleteSpikeActive = false
      STATE.deleteWindow = []
      saveState()
      broadcastUpdate()
      sendResponse({ ok: true })
      break
  }
  return true
})

// ─── Tab Listeners ──────────────────────────────────────────────

chrome.tabs.onActivated.addListener(({ tabId }) => {
  trackTabSwitch(tabId)
  computeCLI()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') trackTabSwitch(tabId)
})

// ─── Idle Listeners ─────────────────────────────────────────────

chrome.idle.setDetectionInterval(60) // Check every 60 seconds
chrome.idle.onStateChanged.addListener(checkIdleState)
setInterval(() => checkIdleState('active'), 30000) // Safety check

// ─── Alarms ─────────────────────────────────────────────────────

chrome.alarms.create('compute-cli', { periodInMinutes: 1 })
chrome.alarms.create('broadcast', { periodInMinutes: 0.25 }) // 15 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'compute-cli') {
    computeCLI()
  } else if (alarm.name === 'broadcast') {
    broadcastUpdate()
  } else if (alarm.name === 'reset-daily') {
    STATE.notificationSentToday = false
    saveState()
  }
})

// ─── Extension install / startup ────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await loadState()
  computeCLI()

  // Enable side panel (Chrome 114+)
  try {
    await chrome.sidePanel.setOptions({
      path: 'popup/index.html',
      enabled: true,
    })
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch {
    // Firefox — side panel not available
  }
})

// Load state on worker start
loadState()
