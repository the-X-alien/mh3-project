import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Send, UserPlus, Eye } from 'lucide-react'
import { useCognitiveLoad } from '@/context/CognitiveLoadContext'
import { fadeUp, slideInRight } from '@/lib/animations'
import { cn } from '@/lib/utils'

type TrafficLight = 'green' | 'yellow' | 'red'

function TrafficDot({ color, label }: { color: TrafficLight; label?: string }) {
  const dotColor = {
    green: 'bg-green',
    yellow: 'bg-amber',
    red: 'bg-amber',
  }[color]

  return (
    <div className="flex items-center gap-2">
      <span className={cn('inline-block w-3 h-3 rounded-pill', dotColor)} />
      {label && <span className="font-mono text-caption uppercase text-fog">{label}</span>}
    </div>
  )
}

export default function TrustedContact() {
  const { state, dispatch } = useCognitiveLoad()
  const [showContactView, setShowContactView] = useState(false)
  const [contactInput, setContactInput] = useState('')
  const [checkedIn, setCheckedIn] = useState(false)

  const trafficLight: TrafficLight = state.cli > 75 ? 'red' : state.cli > 40 ? 'yellow' : 'green'

  const handleSaveContact = () => {
    if (contactInput.trim()) {
      dispatch({ type: 'SET_TRUSTED_CONTACT', contact: contactInput.trim() })
    }
  }

  const handleToggleOptIn = () => {
      dispatch({ type: 'SET_CONTACT_OPT_IN', optIn: !state.contactOptIn })
  }

  const handleCheckIn = () => {
    setCheckedIn(true)
    if (state.cli > 75 && state.contactOptIn && state.trustedContact) {
      dispatch({ type: 'SEND_NOTIFICATION' })
      setShowContactView(true)
    }
    setTimeout(() => setCheckedIn(false), 2000)
  }

  return (
    <div className="border-t border-graphite">
      <div className="px-4.5 py-3 space-y-3">
        <motion.div variants={fadeUp} className="flex items-center gap-1.5">
          <Bell size={14} className="text-violet" />
          <span className="font-mono text-caption uppercase tracking-wider text-fog">
            Close the Loop — Trusted Contact
          </span>
        </motion.div>

        <div className="flex items-center gap-3">
          <TrafficDot color={trafficLight} label="Status" />
          <span className="font-mono text-caption text-ash">
            CLI: {Math.round(state.cli)} —{' '}
            {trafficLight === 'red'
              ? 'Critical'
              : trafficLight === 'yellow'
                ? 'Elevated'
                : 'Healthy'}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCheckIn}
          disabled={checkedIn}
          className="w-full flex items-center justify-center gap-2 rounded-xs px-4 py-2.5
            font-mono text-sm uppercase tracking-wider transition-colors
            bg-violet text-pure hover:bg-violet/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {checkedIn ? 'Logged ✓' : 'Daily Check-In'}
        </motion.button>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <UserPlus size={12} className="text-fog" />
            <span className="font-mono text-caption uppercase tracking-wider text-fog">
              Opt-In Trusted Contact
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              placeholder="Phone or email (simulated)"
              className="flex-1 glass-editor rounded-xs px-3 py-2 font-mono text-caption uppercase
                text-pure placeholder-fog outline-none focus:border-violet"
            />
            <button
              onClick={handleSaveContact}
              disabled={!contactInput.trim() || state.contactOptIn}
              className="rounded-xs px-3 py-2 font-mono text-caption uppercase tracking-wider
                border border-graphite text-fog hover:text-pure hover:border-steel
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOptIn}
              className={cn(
                'rounded-xs px-3 py-1.5 font-mono text-caption uppercase tracking-wider border transition-colors',
                state.contactOptIn
                  ? 'bg-violet text-pure border-violet'
                  : 'border-graphite text-fog hover:text-pure'
              )}
            >
              {state.contactOptIn ? (
                <span className="flex items-center gap-1.5">
                  <BellOff size={12} />
                  Opted In
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Bell size={12} />
                  Enable Nudge
                </span>
              )}
            </button>

            <button
              onClick={() => setShowContactView(!showContactView)}
              className="flex items-center gap-1.5 rounded-xs px-3 py-1.5 font-mono text-caption
                uppercase tracking-wider border border-graphite text-fog hover:text-pure transition-colors"
            >
              <Eye size={12} />
              {showContactView ? 'Hide Demo' : 'Demo Contact View'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {state.trustedContact && state.contactOptIn && state.notificationSent && (
            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="glass-panel rounded-panel p-3.5 border-amber/30"
            >
              <div className="flex items-start gap-3">
                <TrafficDot color="red" />
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-amber mb-1">
                    Nudge Sent to {state.trustedContact}
                  </div>
                  <p className="text-sm text-ash">
                    Your friend may need a check-in today. Reach out?
                  </p>
                  <div className="mt-2 font-mono text-caption text-fog">
                    No raw data shared — only a red signal.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo contact view panel */}
        <AnimatePresence>
          {showContactView && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-panel rounded-panel p-3.5 border-graphite">
                <div className="font-mono text-caption uppercase tracking-wider text-fog mb-2">
                  Trusted Contact View (Demo)
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <TrafficDot
                    color={state.cli > 75 ? 'red' : state.cli > 40 ? 'yellow' : 'green'}
                  />
                  <span className="font-mono text-sm text-pure">Your Friend's Status</span>
                </div>
                <div className="font-mono text-caption text-ash">
                  {state.cli > 75
                    ? 'Your friend may need a check-in today. Reach out?'
                    : state.cli > 40
                      ? 'Your friend seems slightly elevated. Everything okay?'
                      : 'Your friend is doing well today.'}
                </div>
                <div className="mt-2 font-mono text-caption text-fog">
                  No CLI scores, no personal data — just a light.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
