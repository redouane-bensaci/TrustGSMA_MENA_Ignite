import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signup(businessName, email, password)
      navigate('/dashboard/onboarding', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="m-0 font-display text-3xl font-extrabold tracking-[-0.02em]">Create an account.</h1>
      <p className="mt-2 text-sm text-ink/60">Creates your tenant and takes you straight into onboarding.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">BUSINESS NAME</span>
          <input
            required
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">EMAIL</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">PASSWORD</span>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          />
        </label>

        {error ? <p className="text-sm text-rust-dark">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 cursor-pointer rounded-sm bg-ink px-5 py-3 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust disabled:opacity-50"
        >
          {loading ? 'CREATING…' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <div className="mt-6 font-mono text-xs text-ink/50">
        Already have an account?{' '}
        <Link to="/login" className="text-rust hover:text-rust-dark">
          Log in →
        </Link>
      </div>
    </div>
  )
}
