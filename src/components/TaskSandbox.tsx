import { motion } from 'framer-motion'
import { Sliders, Brain, Moon, Clock, AlertTriangle } from 'lucide-react'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import { fadeUp, staggerContainer } from '@/lib/animations'
import CognitiveLoadGauge from './CognitiveLoadGauge'
import ThreeScene from './ThreeScene'

function Slider({
  label,
  icon: Icon,
  value,
  onChange,
  min,
  max,
  step = 1,
  accent,
}: {
  label: string
  icon: any
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  accent?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-fog" />
          <span className="font-mono text-caption uppercase tracking-wider text-fog">{label}</span>
        </div>
        <span className="font-mono text-sm text-pure">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] appearance-none bg-graphite rounded-full outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pure
          [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-graphite
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        style={{
          background: `linear-gradient(to right, ${accent || '#343755'} ${(value / max) * 100}%, #4d4d4d ${(value / max) * 100}%)`,
        }}
      />
    </div>
  )
}

export default function TaskSandbox() {
  const { state, dispatch, calculateCLI } = useCognitiveLoad()

  const handleComplexity = (v: number) => {
    dispatch({ type: 'SET_TASK_COMPLEXITY', value: v })
    setTimeout(calculateCLI, 0)
  }
  const handleHours = (v: number) => {
    dispatch({ type: 'SET_WORK_HOURS', value: v })
    setTimeout(calculateCLI, 0)
  }
  const handleSleep = (v: number) => {
    dispatch({ type: 'SET_SLEEP_HOURS', value: v })
    setTimeout(calculateCLI, 0)
  }

  return (
    <motion.div
      className="flex flex-col h-full relative"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <ThreeScene cli={state.cli} />

      <div className="relative z-10 px-4.5 pt-4.5 pb-3 flex-1 flex flex-col">
        <motion.div variants={fadeUp} className="flex items-center gap-1.5 mb-3">
          <Brain size={14} className="text-violet" />
          <span className="font-mono text-caption uppercase tracking-wider text-fog">
            Task Sandbox & CLI Calculator
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="glass-panel rounded-panel p-3.5 mb-4">
          <div className="font-mono text-caption text-fog mb-1.5">FORMULA</div>
          <div className="font-mono text-xs text-ash leading-relaxed">
            CLI = (Task Complexity × Work Hours) / Sleep Hours
          </div>
          <div className="mt-2 font-mono text-sm text-pure">
            {state.sleepHours === 0 ? (
              <span className="text-amber">Cannot divide by zero</span>
            ) : (
              <span>
                ({state.taskComplexity} × {state.workHours}) / {state.sleepHours} ={' '}
                <span
                  className={
                    state.cli > 75
                      ? 'text-amber font-bold'
                      : state.cli > 40
                        ? 'text-amber'
                        : 'text-green'
                  }
                >
                  {Math.round(state.cli)}
                </span>
              </span>
            )}
          </div>
        </motion.div>

        {state.isOverloaded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 glass-panel rounded-panel px-3.5 py-2 mb-3 border-amber/30"
          >
            <AlertTriangle size={14} className="text-amber" />
            <span className="font-mono text-caption uppercase text-amber">
              [CRITICAL OVERLOAD] Add Task — Locked
            </span>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="space-y-3 flex-1">
          <Slider
            label="Task Complexity"
            icon={Brain}
            value={state.taskComplexity}
            onChange={handleComplexity}
            min={1}
            max={10}
          />
          <Slider
            label="Work Hours"
            icon={Clock}
            value={state.workHours}
            onChange={handleHours}
            min={0}
            max={16}
          />
          <Slider
            label="Sleep Hours"
            icon={Moon}
            value={state.sleepHours}
            onChange={handleSleep}
            min={0}
            max={12}
            accent="#2ecc71"
          />
        </motion.div>

        <motion.div variants={fadeUp} className="mt-auto">
          <CognitiveLoadGauge cli={state.cli} />
        </motion.div>
      </div>
    </motion.div>
  )
}
