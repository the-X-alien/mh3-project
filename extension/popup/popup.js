// Mental Tachometer — Popup UI

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

// ─── DOM refs ──────────────────────────────────────────────────

const gaugeFill = $('#gaugeFill')
const gaugeValue = $('#gaugeValue')
const statusDot = $('#statusDot')
const tabCount = $('#tabCount')
const deleteStatus = $('#deleteStatus')
const idleEl = $('#idleMinutes')
const faultBar = $('#faultBar')
const faultList = $('#faultList')
const overloadPanel = $('#overloadPanel')
const breathingCircle = $('#breathingCircle')
const breathingText = $('#breathingText')
const checkInBtn = $('#checkInBtn')
const resetBtn = $('#resetBtn')
const contactInput = $('#contactInput')
const saveContactBtn = $('#saveContactBtn')
const optInToggle = $('#optInToggle')
const taskSlider = $('#taskSlider')
const workSlider = $('#workSlider')
const sleepSlider = $('#sleepSlider')
const taskValue = $('#taskValue')
const workValue = $('#workValue')
const sleepValue = $('#sleepValue')
const nudgeStatus = $('#nudgeStatus')
const nudgeDot = $('#nudgeDot')
const nudgeText = $('#nudgeText')

// ─── Colors ────────────────────────────────────────────────────

function getColor(cli) {
  if (cli > 75) return '#e6a817'
  if (cli > 40) return '#e6a817'
  return '#2ecc71'
}

// ─── Gauge ─────────────────────────────────────────────────────

const CIRCUMFERENCE = 314 // 2 * Math.PI * 50

function updateGauge(cli) {
  const offset = CIRCUMFERENCE - (cli / 100) * CIRCUMFERENCE
  gaugeFill.style.strokeDashoffset = offset
  gaugeFill.style.stroke = getColor(cli)
  gaugeValue.textContent = Math.round(cli)
  gaugeValue.style.color = getColor(cli)

  // Status dot
  if (cli > 75) {
    statusDot.className = 'status-dot critical'
  } else if (cli > 40) {
    statusDot.className = 'status-dot warning'
  } else {
    statusDot.className = 'status-dot'
  }
}

// ─── Telemetry ─────────────────────────────────────────────────

function updateTelemetry(state) {
  tabCount.textContent = state.tabSwitchCount || 0
  deleteStatus.textContent = state.deleteSpikeActive ? '●' : '○'
  deleteStatus.className = 'stat-dot-label' + (state.deleteSpikeActive ? ' active' : '')
  idleEl.textContent = Math.round(state.idleMinutes || 0)
}

// ─── Fault Codes ───────────────────────────────────────────────

function updateFaultCodes(cli, state) {
  if (cli > 75) {
    const codes = ['ERR_COGNITIVE_SATURATION']
    if (state.tabSwitchCount > 3) codes.push('ERR_CONTEXT_THRASHING')
    if (state.deleteSpikeActive) codes.push('ERR_DELETE_SPIKE')
    if (state.idleMinutes > 5) codes.push('ERR_MICRO_STUTTER')
    faultList.innerHTML = codes.map(c => `<div>FAULT CODE: ${c}</div>`).join('')
    faultBar.style.display = 'block'
  } else {
    faultBar.style.display = 'none'
  }
}

// ─── Overload Panel ────────────────────────────────────────────

let breathingInterval = null

function showOverload(show) {
  overloadPanel.style.display = show ? 'block' : 'none'

  if (show && !breathingInterval) {
    breathingInterval = setInterval(() => {
      breathingCircle.classList.remove('inhale', 'exhale')
      breathingText.textContent = 'Inhale...'
      setTimeout(() => {
        breathingCircle.classList.add('inhale')
        breathingText.textContent = 'Inhale...'
      }, 50)
      setTimeout(() => {
        breathingText.textContent = 'Hold...'
      }, 4000)
      setTimeout(() => {
        breathingCircle.classList.remove('inhale')
        breathingCircle.classList.add('exhale')
        breathingText.textContent = 'Exhale...'
      }, 6000)
      setTimeout(() => {
        breathingCircle.classList.remove('exhale')
      }, 10000)
    }, 10000)
    // Start first cycle
    setTimeout(() => {
      breathingCircle.classList.add('inhale')
    }, 100)
  } else if (!show && breathingInterval) {
    clearInterval(breathingInterval)
    breathingInterval = null
    breathingCircle.classList.remove('inhale', 'exhale')
  }
}

// ─── State Sync ────────────────────────────────────────────────

function updateUI(state) {
  const cli = state.cli || 0
  updateGauge(cli)
  updateTelemetry(state)
  updateFaultCodes(cli, state)
  showOverload(cli > 75)
}

function fetchState() {
  chrome.runtime.sendMessage({ type: 'get-state' }, (response) => {
    if (response?.state) {
      updateUI(response.state)
      // Restore settings
      if (response.state.trustedContact) contactInput.value = response.state.trustedContact
      optInToggle.checked = response.state.contactOptIn || false
      if (response.cliDefaults) {
        taskSlider.value = response.cliDefaults.taskComplexity
        workSlider.value = response.cliDefaults.workHours
        sleepSlider.value = response.cliDefaults.sleepHours
        taskValue.textContent = response.cliDefaults.taskComplexity
        workValue.textContent = response.cliDefaults.workHours
        sleepValue.textContent = response.cliDefaults.sleepHours
      }
    }
  })
}

// Listen for background updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'state-update' && msg.state) {
    updateUI(msg.state)
  }
})

// ─── Check-in ──────────────────────────────────────────────────

checkInBtn.addEventListener('click', () => {
  checkInBtn.disabled = true
  checkInBtn.textContent = 'Logging...'
  chrome.runtime.sendMessage({ type: 'check-in' }, (response) => {
    if (response?.ok) {
      checkInBtn.textContent = 'Logged ✓'
      setTimeout(() => {
        checkInBtn.disabled = false
        checkInBtn.textContent = 'Daily Check-In'
      }, 2000)
    }
  })
})

// ─── Reset Overload ────────────────────────────────────────────

resetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reset-overload' }, () => {
    fetchState()
  })
})

// ─── Settings ──────────────────────────────────────────────────

saveContactBtn.addEventListener('click', () => {
  const email = contactInput.value.trim()
  if (!email.includes('@')) return
  chrome.runtime.sendMessage({
    type: 'set-settings',
    trustedContact: email,
  })
  saveContactBtn.textContent = 'Saved'
  setTimeout(() => { saveContactBtn.textContent = 'Save' }, 1500)
})

optInToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    type: 'set-settings',
    contactOptIn: optInToggle.checked,
  })
})

// CLI formula sliders
taskSlider.addEventListener('input', () => {
  taskValue.textContent = taskSlider.value
  chrome.runtime.sendMessage({
    type: 'set-settings',
    taskComplexity: Number(taskSlider.value),
  })
})

workSlider.addEventListener('input', () => {
  workValue.textContent = workSlider.value
  chrome.runtime.sendMessage({
    type: 'set-settings',
    workHours: Number(workSlider.value),
  })
})

sleepSlider.addEventListener('input', () => {
  sleepValue.textContent = sleepSlider.value
  chrome.runtime.sendMessage({
    type: 'set-settings',
    sleepHours: Number(sleepSlider.value),
  })
})

// ─── Init ──────────────────────────────────────────────────────

fetchState()

// Poll for updates every 2 seconds as fallback
setInterval(fetchState, 2000)
