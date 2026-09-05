import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div>
      <h1 className="m-0 font-display text-3xl font-extrabold tracking-[-0.02em]">Reset your password.</h1>
      <p className="mt-2 text-sm text-ink/60">
        Hackathon placeholder — no email is actually sent yet.
      </p>

      {sent ? (
        <p className="mt-6 rounded border border-ink/16 bg-white/40 p-4 text-sm text-ink/70">
          If an account exists for that email, a reset link would be sent.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">EMAIL</span>
            <input
              required
              type="email"
              className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
            />
          </label>
          <button
            type="submit"
            className="mt-1 cursor-pointer rounded-sm bg-ink px-5 py-3 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust"
          >
            SEND RESET LINK
          </button>
        </form>
      )}

      <div className="mt-6 font-mono text-xs text-ink/50">
        <Link to="/login" className="hover:text-rust">
          ← Back to log in
        </Link>
      </div>
    </div>
  )
}
