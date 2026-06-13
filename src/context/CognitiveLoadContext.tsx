import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import { TelemetryEvent } from '@/lib/telemetry'
import { clamp } from '@/lib/utils'

type FaultCode = string

type State = {
  cli: number
  taskComplexity: number
  workHours: number
  sleepHours: number
  isOverloaded: boolean
  faultCodes: FaultCode[]
  trustedContact: string | null
  contactOptIn: boolean
  notificationSent: boolean
  telemetryLog: TelemetryEvent[]
  tabSwitchCount: number
  deleteSpikeActive: boolean
  idleCount: number
}

type Action =
  | { type: 'SET_TASK_COMPLEXITY'; value: number }
  | { type: 'SET_WORK_HOURS'; value: number }
  | { type: 'SET_SLEEP_HOURS'; value: number }
  | { type: 'RECALCULATE_CLI' }
  | { type: 'ADD_TAB_SWITCH' }
  | { type: 'SET_DELETE_SPIKE'; active: boolean }
  | { type: 'ADD_IDLE' }
  | { type: 'ADD_TELEMETRY'; event: TelemetryEvent }
  | { type: 'OVERLOAD_TRIGGER' }
  | { type: 'RESET_OVERLOAD' }
  | { type: 'SET_TRUSTED_CONTACT'; contact: string | null }
  | { type: 'SET_CONTACT_OPT_IN'; optIn: boolean }
  | { type: 'SEND_NOTIFICATION' }

function computeBaseCLI(state: State): number {
  if (state.sleepHours === 0) return 100
  const base = (state.taskComplexity * state.workHours) / state.sleepHours
  return clamp(base * 6, 0, 100)
}

function computeTelemetryPenalty(state: State): number {
  let penalty = 0
  penalty += state.tabSwitchCount * 5
  if (state.deleteSpikeActive) penalty += 10
  penalty += state.idleCount * 3
  return penalty
}

function computeFaultCodes(state: State): FaultCode[] {
  const codes: FaultCode[] = []
  codes.push('ERR_COGNITIVE_SATURATION')
  if (state.tabSwitchCount > 1) codes.push('ERR_CONTEXT_THRASHING')
  if (state.deleteSpikeActive) codes.push('ERR_DELETE_SPIKE')
  if (state.idleCount > 0) codes.push('ERR_MICRO_STUTTER')
  return codes
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TASK_COMPLEXITY':
      return { ...state, taskComplexity: action.value }
    case 'SET_WORK_HOURS':
      return { ...state, workHours: action.value }
    case 'SET_SLEEP_HOURS':
      return { ...state, sleepHours: action.value }
    case 'RECALCULATE_CLI': {
      const base = computeBaseCLI(state)
      const penalty = computeTelemetryPenalty(state)
      const cli = clamp(base + penalty, 0, 100)
      const isOverloaded = cli > 75
      return {
        ...state,
        cli,
        isOverloaded,
        faultCodes: isOverloaded ? computeFaultCodes(state) : state.faultCodes,
      }
    }
    case 'ADD_TAB_SWITCH': {
      const tabSwitchCount = state.tabSwitchCount + 1
      const next = { ...state, tabSwitchCount }
      const base = computeBaseCLI(next)
      const penalty = computeTelemetryPenalty(next)
      const cli = clamp(base + penalty, 0, 100)
      const isOverloaded = cli > 75
      return {
        ...next,
        cli,
        isOverloaded,
        faultCodes: isOverloaded ? computeFaultCodes(next) : next.faultCodes,
      }
    }
    case 'SET_DELETE_SPIKE': {
      const next = { ...state, deleteSpikeActive: action.active }
      const base = computeBaseCLI(next)
      const penalty = computeTelemetryPenalty(next)
      const cli = clamp(base + penalty, 0, 100)
      const isOverloaded = cli > 75
      return {
        ...next,
        cli,
        isOverloaded,
        faultCodes: isOverloaded ? computeFaultCodes(next) : next.faultCodes,
      }
    }
    case 'ADD_IDLE': {
      const idleCount = state.idleCount + 1
      const next = { ...state, idleCount }
      const base = computeBaseCLI(next)
      const penalty = computeTelemetryPenalty(next)
      const cli = clamp(base + penalty, 0, 100)
      const isOverloaded = cli > 75
      return {
        ...next,
        cli,
        isOverloaded,
        faultCodes: isOverloaded ? computeFaultCodes(next) : next.faultCodes,
      }
    }
    case 'ADD_TELEMETRY':
      return { ...state, telemetryLog: [...state.telemetryLog.slice(-50), action.event] }
    case 'OVERLOAD_TRIGGER': {
      const base = computeBaseCLI(state)
      const penalty = computeTelemetryPenalty(state)
      const cli = clamp(base + penalty, 0, 100)
      return {
        ...state,
        cli: Math.max(cli, 76),
        isOverloaded: true,
        faultCodes: computeFaultCodes(state),
      }
    }
    case 'RESET_OVERLOAD':
      return {
        ...state,
        cli: 0,
        isOverloaded: false,
        faultCodes: [],
        tabSwitchCount: 0,
        deleteSpikeActive: false,
        idleCount: 0,
        telemetryLog: [],
      }
    case 'SET_TRUSTED_CONTACT':
      return { ...state, trustedContact: action.contact }
    case 'SET_CONTACT_OPT_IN':
      return { ...state, contactOptIn: action.optIn }
    case 'SEND_NOTIFICATION':
      return { ...state, notificationSent: true }
    default:
      return state
  }
}

const initialState: State = {
  cli: 0,
  taskComplexity: 5,
  workHours: 4,
  sleepHours: 7,
  isOverloaded: false,
  faultCodes: [],
  trustedContact: null,
  contactOptIn: false,
  notificationSent: false,
  telemetryLog: [],
  tabSwitchCount: 0,
  deleteSpikeActive: false,
  idleCount: 0,
}

type CognitiveLoadContextType = {
  state: State
  dispatch: React.Dispatch<Action>
  addTelemetryEvent: (event: TelemetryEvent) => void
  handleTabSwitch: () => void
  handleDeleteSpike: (active: boolean) => void
  handleIdle: () => void
  resetOverload: () => void
  calculateCLI: () => void
}

const CognitiveLoadContext = createContext<CognitiveLoadContextType | null>(null)

export function CognitiveLoadProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const recalculate = useCallback(() => {
    dispatch({ type: 'RECALCULATE_CLI' })
  }, [])

  const addTelemetryEvent = useCallback((event: TelemetryEvent) => {
    dispatch({ type: 'ADD_TELEMETRY', event })
  }, [])

  const handleTabSwitch = useCallback(() => {
    dispatch({ type: 'ADD_TAB_SWITCH' })
  }, [])

  const handleDeleteSpike = useCallback((active: boolean) => {
    dispatch({ type: 'SET_DELETE_SPIKE', active })
  }, [])

  const handleIdle = useCallback(() => {
    dispatch({ type: 'ADD_IDLE' })
  }, [])

  const resetOverload = useCallback(() => {
    dispatch({ type: 'RESET_OVERLOAD' })
  }, [])

  const calculateCLI = useCallback(() => {
    dispatch({ type: 'RECALCULATE_CLI' })
  }, [])

  return (
    <CognitiveLoadContext.Provider
      value={{
        state,
        dispatch,
        addTelemetryEvent,
        handleTabSwitch,
        handleDeleteSpike,
        handleIdle,
        resetOverload,
        calculateCLI,
      }}
    >
      {children}
    </CognitiveLoadContext.Provider>
  )
}

export function useCognitiveLoad() {
  const ctx = useContext(CognitiveLoadContext)
  if (!ctx) throw new Error('useCognitiveLoad must be used within CognitiveLoadProvider')
  return ctx
}
