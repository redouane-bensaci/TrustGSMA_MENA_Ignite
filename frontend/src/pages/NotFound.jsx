import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="bg-grid flex min-h-screen flex-col items-center justify-center gap-4 font-sans text-ink">
      <div className="font-mono text-[11px] tracking-[0.2em] text-ink/40">404</div>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em]">Page not found.</h1>
      <Link to="/" className="font-mono text-sm text-rust hover:text-rust-dark">
        ← back home
      </Link>
    </div>
  )
}
