import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import RequireAuth from '../components/RequireAuth'
import { useAuth } from '../lib/AuthContext'

const NAV = [
  { to: '/dashboard', label: 'Overview', end: true, tag: 'DEMO' },
  { to: '/dashboard/transactions', label: 'Transactions', tag: 'DEMO' },
  { to: '/dashboard/tools', label: 'Tool registry', tag: 'SITE' },
  { to: '/dashboard/api-keys', label: 'API keys', tag: 'SITE' },
  { to: '/dashboard/webhooks', label: 'Webhooks', tag: 'SITE' },
  { to: '/dashboard/usage', label: 'Usage', tag: 'LATER' },
  { to: '/dashboard/settings', label: 'Settings', tag: 'SITE' },
]

const TAG_COLOR = {
  DEMO: 'text-rust',
  SITE: 'text-ink/35',
  LATER: 'text-ink/25',
}

function DashboardShell() {
  const { user, logout } = useAuth()
  const location = useLocation()

  if (user && !user.onboarded && location.pathname !== '/dashboard/onboarding') {
    return <Navigate to="/dashboard/onboarding" replace />
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <div className="mx-auto flex max-w-[1320px]">
        <aside className="sticky top-0 flex h-screen w-[220px] flex-none flex-col border-r border-ink/12 px-5 py-6">
          <Link to="/" className="font-mono text-sm font-semibold tracking-[0.42em] text-ink no-underline">
            TRUST
          </Link>
          <nav className="mt-8 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-sm px-3 py-2 font-mono text-[12px] tracking-[0.03em] no-underline transition-colors ${
                    isActive ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-ink/6'
                  }`
                }
              >
                <span>{item.label}</span>
                <span className={`text-[9px] tracking-[0.1em] ${TAG_COLOR[item.tag]}`}>{item.tag}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-ink/10 pt-4">
            <div className="font-mono text-[11px] text-ink/70">{user?.business_name}</div>
            <div className="truncate font-mono text-[10px] text-ink/40">{user?.email}</div>
            <button
              onClick={logout}
              className="mt-1 cursor-pointer self-start border-none bg-transparent font-mono text-[10px] tracking-[0.12em] text-ink/40 hover:text-rust"
            >
              LOG OUT
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  return (
    <RequireAuth>
      <DashboardShell />
    </RequireAuth>
  )
}
