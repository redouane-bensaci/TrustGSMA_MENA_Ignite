import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function DashboardTools() {
  const [tools, setTools] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .listTools()
      .then(setTools)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · TOOL REGISTRY</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Enabled for your tenant.
      </h1>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink/60">
        Read-only — the registry is intentionally closed. Cost weights shown here are what the
        reasoning loop actually spends against your budget.
      </p>

      {error ? (
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
          Couldn't reach the API ({error}).
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded border border-ink/14">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/14 bg-white/50 text-left font-mono text-[10.5px] tracking-[0.1em] text-ink/45">
              <th className="px-4 py-3 font-medium">TOOL</th>
              <th className="px-4 py-3 font-medium">CAMARA STANDARD</th>
              <th className="px-4 py-3 font-medium">COST WEIGHT</th>
              <th className="px-4 py-3 font-medium">LATENCY</th>
            </tr>
          </thead>
          <tbody>
            {(tools || []).map((t) => (
              <tr key={t.id} className="border-b border-ink/8 bg-white/20">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{t.name}</div>
                  <div className="mt-0.5 max-w-[46ch] text-xs text-ink/50">{t.description}</div>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-ink/55">{t.camara_standard}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-rust">{t.cost_weight}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink/55">{t.latency_profile}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tools && !error ? <div className="p-8 text-center font-mono text-xs text-ink/40">// loading…</div> : null}
      </div>
    </div>
  )
}
