import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './AppLayout'
import Landing from './Landing'
import Dashboard from './Dashboard'
import History from './History'
import Breathe from './Breathe'
import Settings from './Settings'
import SignIn from './SignIn'
import Contacts from './Contacts'
import QA from './QA'
import HowItWorks from './HowItWorks'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/breathe" element={<Breathe />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/qa" element={<QA />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
