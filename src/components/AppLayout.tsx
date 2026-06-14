import { Outlet } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import { WellnessProvider } from '@/context/WellnessContext'
import NavBar from './NavBar'
import TitleBar from './TitleBar'
import StressMonitor from './StressDetector'
import BreathingExercise from './BreathingExercise'

export default function AppLayout() {
  return (
    <WellnessProvider>
      <TitleBar />
      <StressMonitor />
      <ReactLenis
        root
        options={{ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) }}
      >
        <NavBar />
        <main className="px-4 pb-24">
          <Outlet />
        </main>
      </ReactLenis>
      <BreathingExercise />
    </WellnessProvider>
  )
}
