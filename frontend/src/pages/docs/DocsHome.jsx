import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/docs/quickstart', title: 'Quickstart', desc: 'Copy-paste curl example, get your first verdict in under a minute.' },
  { to: '/docs/api-reference', title: 'API reference', desc: 'Every endpoint your frontend and integrators actually call.' },
  { to: '/docs/tools', title: 'Tool registry', desc: 'The seven CAMARA network tools TRUST is allowed to call, in plain language.' },
]

export default function DocsHome() {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">DOCUMENTATION</div>
      <h1 className="m-0 font-display text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-0.03em]">
        Everything you need to integrate.
      </h1>
      <p className="mt-3 max-w-[58ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
        One endpoint does the real work — <code className="rounded-sm bg-panel px-1.5 py-0.5 font-mono text-[13px] text-cream">POST /v1/verify</code> —
        everything else here explains how to shape a business binding, read a verdict, and see what
        the agent is and isn't allowed to call.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="block rounded border border-ink/16 bg-white/40 p-5 no-underline transition-colors hover:border-ink/40"
          >
            <div className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{l.title}</div>
            <div className="mt-1 text-sm text-ink/60">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
