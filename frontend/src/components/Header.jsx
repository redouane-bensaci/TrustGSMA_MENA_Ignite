import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import WaveSection from './WaveSection'

const NAV = [
  { to: '/how-it-works', label: 'HOW IT WORKS' },
  { to: '/docs', label: 'DOCS' },
  { to: '/playground', label: 'PLAYGROUND' },
  { to: '/pricing', label: 'PRICING' },
]

export default function Header({ onSectionEnter }) {
  const { user, logout } = useAuth()

  return (
    <WaveSection
      mode="calm"
      onEnter={onSectionEnter}
      className="flex flex-wrap items-center justify-between gap-4 pt-[26px]"
    >
      <div className="flex flex-wrap items-center gap-6">
        <Link to="/" className="font-mono text-sm font-semibold tracking-[0.42em] text-ink no-underline">
          TRUST
        </Link>
        <nav className="flex flex-wrap gap-4 font-mono text-[11px] tracking-[0.12em]">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `no-underline transition-colors hover:text-rust ${isActive ? 'text-rust' : 'text-ink/70'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              to="/dashboard"
              className="rounded-sm border border-ink/16 px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-ink no-underline hover:border-ink"
            >
              DASHBOARD
            </Link>
            <button
              onClick={logout}
              className="cursor-pointer border-none bg-transparent font-mono text-[10px] tracking-[0.16em] text-ink/45 hover:text-rust"
            >
              LOG OUT
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="font-mono text-[11px] tracking-[0.12em] text-ink/70 no-underline hover:text-rust">
              LOG IN
            </Link>
            <Link
              to="/signup"
              className="rounded-sm bg-ink px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-paper no-underline hover:bg-rust"
            >
              SIGN UP
            </Link>
          </>
        )}
      </div>
    </WaveSection>
  )
}
