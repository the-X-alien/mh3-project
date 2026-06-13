// Mental Tachometer — Content Script
// Injected into all pages to monitor keystroke patterns (delete spike detection).

let activeInput = null
let lastKeyTime = 0
const THROTTLE_MS = 50

// Track focused elements (inputs, textareas, contenteditable)
document.addEventListener('focusin', (e) => {
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
    activeInput = e.target
  }
})

document.addEventListener('focusout', () => {
  activeInput = null
})

// Monitor keystrokes
document.addEventListener('keydown', (e) => {
  const now = Date.now()
  if (now - lastKeyTime < THROTTLE_MS) return
  lastKeyTime = now

  const isDelete = e.key === 'Backspace' || e.key === 'Delete'
  chrome.runtime.sendMessage({
    type: 'keystroke',
    isDelete,
  }).catch(() => {})
})

// Report when this tab becomes active (alternative to tabs.onActivated
// which is already handled in background, but this adds redundancy)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    chrome.runtime.sendMessage({ type: 'tab-switch' }).catch(() => {})
  }
})

console.log('[Mental Tachometer] Content script active.')
