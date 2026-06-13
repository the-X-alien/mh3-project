import { ReactLenis } from 'lenis/react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { WellnessProvider } from '@/context/WellnessContext'
import Dashboard from './Dashboard'
import ThemeToggle from './ThemeToggle'
import TitleBar from './TitleBar'
import BreathingExercise from './BreathingExercise'
import StressMonitor from './StressDetector'
import Landing from './Landing'
import SignIn from './SignIn'
import { Loader2 } from 'lucide-react'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-amber" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function DashboardLayout() {
  return (
    <WellnessProvider>
      <TitleBar />
      <StressMonitor />
      <ReactLenis root options={{ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) }}>
        <ThemeToggle />
        <Dashboard />
      </ReactLenis>
      <BreathingExercise />
    </WellnessProvider>
  )
}

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-amber" />
      </div>
    )
  }
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  return <Landing />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
