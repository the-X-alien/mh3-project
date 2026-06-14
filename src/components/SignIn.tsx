import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Seo from './Seo'

export default function SignIn() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'sign-up') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || 'User' } },
        })
        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }
        setError('Check your email for the confirmation link.')
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setGithubLoading(true)
    setError('')
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin },
      })
      if (oauthError) setError(oauthError.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with GitHub')
    } finally {
      setGithubLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Seo title="Sign In — Wellness Dashboard" description="Sign in or create your Shanti account to track your wellness history, configure email check-ins, and manage your settings." path="/sign-in" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl leading-none" role="img" aria-label="Shanti">🙏</span>
            <span className="font-cursive text-2xl text-pure">Shanti</span>
          </Link>
          <h1 className="font-cursive text-3xl text-pure mb-2">
            {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="font-body text-sm text-fog">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Start your wellness journey'}
          </p>
        </div>

        <div className="flex bg-white/[0.03] rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('sign-in'); setError('') }}
            className={`flex-1 py-2 rounded-lg font-body text-xs transition-all ${
              mode === 'sign-in' ? 'bg-amber/10 text-amber' : 'text-fog/60 hover:text-fog'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('sign-up'); setError('') }}
            className={`flex-1 py-2 rounded-lg font-body text-xs transition-all ${
              mode === 'sign-up' ? 'bg-amber/10 text-amber' : 'text-fog/60 hover:text-fog'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 font-body text-[11px] text-fog/40 bg-[#0b0d12]">or continue with</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGitHubSignIn}
          disabled={githubLoading}
          className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-pure font-body text-sm hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mb-6"
        >
          {githubLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          )}
          {githubLoading ? 'Redirecting...' : 'Continue with GitHub'}
        </motion.button>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign-up' && (
            <div>
              <label className="block font-body text-xs text-fog mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-pure font-body text-sm placeholder:text-fog/30 outline-none focus:border-amber/40 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block font-body text-xs text-fog mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-pure font-body text-sm placeholder:text-fog/30 outline-none focus:border-amber/40 transition-colors"
            />
          </div>

          <div>
            <label className="block font-body text-xs text-fog mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-pure font-body text-sm placeholder:text-fog/30 outline-none focus:border-amber/40 transition-colors"
            />
          </div>

          {error && (
            <p className={`font-body text-xs text-center ${error.includes('Check your email') ? 'text-green/80' : 'text-amber/80'}`}>{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-xl bg-amber/10 border border-amber/30 text-amber font-body text-sm hover:bg-amber/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <p className="text-center mt-6">
          <Link to="/" className="font-body text-xs text-fog/50 hover:text-fog transition-colors">
            Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
