import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="bg-grid flex min-h-screen flex-col font-sans text-ink">
      <header className="px-6 pt-6">
        <Link to="/" className="font-mono text-sm font-semibold tracking-[0.42em] text-ink no-underline">
          TRUST
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </main>
      <footer className="px-6 pb-6 text-center font-mono text-[10px] tracking-[0.14em] text-ink/35">
        TRUST · MOBILE IDENTITY VERDICTS
      </footer>
    </div>
  )
}
