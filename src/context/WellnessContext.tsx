import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'

export type EmailFrequency = 'off' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

type State = {
  stress: number
  email: string
  emailFrequency: EmailFrequency
  breathingActive: boolean
  lastBreathing: number
  sessionCount: number
  checkIns: number
  streaks: number
  tabSwitches: number
  idleEvents: number
  typingSpikes: number
}

type Action =
  | { type: 'SET_STRESS'; value: number }
  | { type: 'ADD_TAB_SWITCH' }
  | { type: 'ADD_IDLE' }
  | { type: 'ADD_TYPING_SPIKE' }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_FREQUENCY'; value: EmailFrequency }
  | { type: 'START_BREATHING' }
  | { type: 'STOP_BREATHING' }
  | { type: 'ADD_CHECK_IN' }
  | { type: 'RESET_SESSION' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STRESS':
      return { ...state, stress: Math.min(100, Math.max(0, action.value)) }
    case 'ADD_TAB_SWITCH': {
      const s = Math.min(100, state.stress + 8)
      return { ...state, tabSwitches: state.tabSwitches + 1, stress: s }
    }
    case 'ADD_IDLE': {
      const s = Math.min(100, state.stress + 5)
      return { ...state, idleEvents: state.idleEvents + 1, stress: s }
    }
    case 'ADD_TYPING_SPIKE': {
      const s = Math.min(100, state.stress + 12)
      return { ...state, typingSpikes: state.typingSpikes + 1, stress: s }
    }
    case 'SET_EMAIL':
      return { ...state, email: action.value }
    case 'SET_FREQUENCY':
      return { ...state, emailFrequency: action.value }
    case 'START_BREATHING':
      return { ...state, breathingActive: true, lastBreathing: Date.now() }
    case 'STOP_BREATHING': {
      const stressDrop = Math.max(10, state.stress * 0.5)
      return { ...state, breathingActive: false, stress: Math.max(0, state.stress - stressDrop) }
    }
    case 'ADD_CHECK_IN':
      return { ...state, checkIns: state.checkIns + 1 }
    case 'RESET_SESSION':
      return {
        ...state,
        stress: 0,
        tabSwitches: 0,
        idleEvents: 0,
        typingSpikes: 0,
      }
    default:
      return state
  }
}

const initialState: State = {
  stress: 0,
  email: '',
  emailFrequency: 'daily',
  breathingActive: false,
  lastBreathing: 0,
  sessionCount: 0,
  checkIns: 0,
  streaks: 0,
  tabSwitches: 0,
  idleEvents: 0,
  typingSpikes: 0,
}

type WellnessContextType = {
  state: State
  dispatch: React.Dispatch<Action>
  addTabSwitch: () => void
  addIdle: () => void
  addTypingSpike: () => void
  startBreathing: () => void
  stopBreathing: () => void
  addCheckIn: () => void
  resetSession: () => void
}

const WellnessContext = createContext<WellnessContextType | null>(null)

export function WellnessProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const addTabSwitch = useCallback(() => dispatch({ type: 'ADD_TAB_SWITCH' }), [])
  const addIdle = useCallback(() => dispatch({ type: 'ADD_IDLE' }), [])
  const addTypingSpike = useCallback(() => dispatch({ type: 'ADD_TYPING_SPIKE' }), [])
  const startBreathing = useCallback(() => dispatch({ type: 'START_BREATHING' }), [])
  const stopBreathing = useCallback(() => dispatch({ type: 'STOP_BREATHING' }), [])
  const addCheckIn = useCallback(() => dispatch({ type: 'ADD_CHECK_IN' }), [])
  const resetSession = useCallback(() => dispatch({ type: 'RESET_SESSION' }), [])

  return (
    <WellnessContext.Provider
      value={{ state, dispatch, addTabSwitch, addIdle, addTypingSpike, startBreathing, stopBreathing, addCheckIn, resetSession }}
    >
      {children}
    </WellnessContext.Provider>
  )
}

export function useWellness() {
  const ctx = useContext(WellnessContext)
  if (!ctx) throw new Error('useWellness must be used within WellnessProvider')
  return ctx
}
