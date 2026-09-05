import { NavLink, Outlet } from 'react-router-dom'

const DOCS_NAV = [
  { to: '/docs', label: 'Overview', end: true },
  { to: '/docs/quickstart', label: 'Quickstart' },
  { to: '/docs/api-reference', label: 'API reference' },
  { to: '/docs/tools', label: 'Tool registry' },
]

export default function DocsLayout() {
  return (
    <section className="grid gap-[clamp(24px,4vw,56px)] py-[clamp(38px,5vw,64px)] pb-[clamp(70px,10vw,120px)] md:grid-cols-[180px_1fr]">
      <nav className="flex flex-row flex-wrap gap-1 md:sticky md:top-6 md:h-fit md:flex-col">
        {DOCS_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-sm px-3 py-2 font-mono text-[12px] tracking-[0.04em] no-underline transition-colors ${
                isActive ? 'bg-ink text-paper' : 'text-ink/65 hover:bg-ink/8'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </section>
  )
}
