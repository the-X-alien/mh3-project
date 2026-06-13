import { ReactLenis } from 'lenis/react'
import { CognitiveLoadProvider } from '@/context/CognitiveLoadContext'
import Dashboard from './Dashboard'

export default function App() {
  return (
    <CognitiveLoadProvider>
      <ReactLenis root options={{ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) }}>
        <Dashboard />
      </ReactLenis>
    </CognitiveLoadProvider>
  )
}
