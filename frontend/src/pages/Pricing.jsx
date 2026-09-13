import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

// MOCK PRICING — illustrative numbers only, not a quote. Real per-unit rates
// depend on carrier partnership terms that are still being negotiated.

const BANDS = [
  { key: 'routine', units: 2, label: 'Routine', desc: 'Cheap signals agree, closed fast — most of the volume lives here.' },
  { key: 'elevated', units: 4, label: 'Elevated', desc: 'One signal is off, binding still holds — the agent buys one more check.' },
  { key: 'critical', units: 7, label: 'Critical', desc: 'Independent signals disagree — the full loop runs before it closes.' },
]

const PLANS = [
  { id: 'sandbox', name: 'Sandbox', monthly: 0, included: 500, overage: null, blurb: 'Sandbox numbers only. Build and test the integration.', features: ['500 units / month', 'Sandbox MSISDNs', 'Playground + history', 'Community support'] },
  { id: 'growth', name: 'Growth', monthly: 15000, included: 5000, overage: 3.5, blurb: 'Live carrier signals for a growing merchant.', features: ['5,000 units included', '3.5 DZD per extra unit', 'Webhooks', 'Email support'], featured: true },
  { id: 'scale', name: 'Scale', monthly: 90000, included: 40000, overage: 2.4, blurb: 'High-volume platforms and fintechs.', features: ['40,000 units included', '2.4 DZD per extra unit', 'Custom risk policies', 'Priority support · 99.9% SLA'] },
  { id: 'enterprise', name: 'Enterprise', monthly: null, included: null, overage: null, blurb: 'Banks, operators, and multi-tenant marketplaces.', features: ['Volume unit pricing', 'Dedicated carrier routing', 'On-prem ledger option', 'Named account team'] },
]

const SIGNALS = [
  ['Number Verification', 'verify_number', 1],
  ['Device Status & Roaming', 'get_device_status', 1],
  ['Device Location Verification', 'verify_location', 1],
  ['Number Recycling Check', 'check_number_recycling', 1],
  ['SIM Swap Recency Probe', 'check_sim_swap', 2],
  ['Device Location Retrieval', 'retrieve_location', 2],
  ['Carrier KYC Match', 'kyc_match', 2],
]

const fmt = (n) => Math.round(n).toLocaleString('en-US')

function planCost(plan, units) {
  if (plan.monthly === null) return null
  if (plan.overage === null) return units <= plan.included ? 0 : null
  return plan.monthly + Math.max(0, units - plan.included) * plan.overage
}

function Slider({ label, value, onChange, min, max, step, suffix }) {
  return (
    <label className="block">
      <div className="flex justify-between font-mono text-[11px] tracking-[0.12em] text-ink/60">
        <span>{label}</span>
        <span className="font-semibold text-ink">{fmt(value)}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-rust)]"
      />
    </label>
  )
}

export default function Pricing() {
  const [volume, setVolume] = useState(3000)
  const [elevated, setElevated] = useState(20)
  const [critical, setCritical] = useState(5)
  const [noSim, setNoSim] = useState(5)

  const est = useMemo(() => {
    const billable = volume * (1 - noSim / 100)
    const routinePct = Math.max(0, 100 - elevated - critical)
    const mix = { routine: routinePct, elevated, critical }
    const byBand = BANDS.map((b) => {
      const count = billable * (mix[b.key] / 100)
      return { ...b, pct: mix[b.key], count, unitsUsed: count * b.units }
    })
    const units = byBand.reduce((s, b) => s + b.unitsUsed, 0)
    const costs = PLANS.map((p) => ({ plan: p, cost: planCost(p, units) }))
    const priced = costs.filter((c) => c.cost !== null)
    const best = priced.length ? priced.reduce((a, b) => (b.cost < a.cost ? b : a)) : null
    return { byBand, units, costs, best, heldNoSim: volume * (noSim / 100) }
  }, [volume, elevated, critical, noSim])

  const maxUnits = Math.max(...est.byBand.map((b) => b.unitsUsed), 1)

  return (
    <>
      <PageHero
        eyebrow="PRICING · MOCK"
        title="Priced in cost units, not seats."
        description="Every /v1/verify call spends 2, 4, or 7 units depending on what the transaction deserves. Plans bundle units; you pay overage only for what the agent actually buys. Numbers below are a mock-up, not a quote."
      />

      {/* Decision bands */}
      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)]">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {BANDS.map((b) => (
            <div key={b.key} className="rounded border border-ink/18 bg-white/40 p-6">
              <div className="font-mono text-[28px] font-semibold text-rust">{b.units}</div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ink/45">UNITS · {b.label.toUpperCase()}</div>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{b.desc}</p>
            </div>
          ))}
          <div className="rounded border border-dashed border-ink/25 bg-white/30 p-6">
            <div className="font-mono text-[28px] font-semibold text-ink/50">0</div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ink/45">UNITS · NO SIM</div>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">Computer or no-SIM users are held by default. No carrier call runs, so nothing is billed.</p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)]">
        <div className="font-mono text-[10px] tracking-[0.2em] text-ink/45">PLANS</div>
        <h2 className="mt-3 font-display text-[clamp(22px,2.6vw,32px)] font-bold tracking-[-0.02em]">Bundle units, pay overage as you go.</h2>
        <div className="mt-8 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {PLANS.map((p) => {
            const isBest = est.best?.plan.id === p.id
            return (
              <div key={p.id} className={`relative flex flex-col rounded border p-6 ${p.featured ? 'border-rust bg-white/60' : 'border-ink/18 bg-white/40'}`}>
                {isBest && (
                  <span className="absolute -top-2.5 right-4 rounded-sm bg-rust px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-paper">BEST FOR YOUR USAGE</span>
                )}
                <div className="font-mono text-[11px] tracking-[0.2em] text-ink/55">{p.name.toUpperCase()}</div>
                <div className="mt-3 font-display text-[30px] font-bold tracking-[-0.02em]">
                  {p.monthly === null ? 'Custom' : p.monthly === 0 ? 'Free' : `${fmt(p.monthly)}`}
                  {p.monthly > 0 && <span className="ml-1 font-mono text-xs font-normal text-ink/50">DZD / mo</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{p.blurb}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink/75">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-rust">—</span>{f}</li>
                  ))}
                </ul>
                <Link
                  to={p.id === 'enterprise' ? '/contact' : '/signup'}
                  className={`mt-6 inline-block rounded-sm border px-4 py-2.5 text-center font-mono text-xs font-semibold tracking-[0.12em] no-underline ${p.featured ? 'border-rust bg-rust text-paper hover:bg-rust-dark' : 'border-ink text-ink hover:bg-ink hover:text-paper'}`}
                >
                  {p.id === 'enterprise' ? 'CONTACT SALES' : p.id === 'sandbox' ? 'START FREE' : 'CHOOSE PLAN'}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* Usage estimator */}
      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)]">
        <div className="font-mono text-[10px] tracking-[0.2em] text-ink/45">API USAGE ESTIMATOR</div>
        <h2 className="mt-3 font-display text-[clamp(22px,2.6vw,32px)] font-bold tracking-[-0.02em]">What would a month of /v1/verify cost?</h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6 rounded border border-ink/18 bg-white/40 p-6">
            <Slider label="VERIFY CALLS / MONTH" value={volume} onChange={setVolume} min={100} max={100000} step={100} />
            <Slider label="ELEVATED SHARE" value={elevated} onChange={(v) => setElevated(Math.min(v, 100 - critical))} min={0} max={100} step={1} suffix="%" />
            <Slider label="CRITICAL SHARE" value={critical} onChange={(v) => setCritical(Math.min(v, 100 - elevated))} min={0} max={100} step={1} suffix="%" />
            <Slider label="NO-SIM / COMPUTER USERS" value={noSim} onChange={setNoSim} min={0} max={100} step={1} suffix="%" />
            <p className="font-mono text-[11px] text-ink/50">Routine share is the remainder: {Math.max(0, 100 - elevated - critical)}%.</p>
          </div>

          <div className="rounded border border-ink/18 bg-white/40 p-6">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] tracking-[0.12em] text-ink/55">UNITS / MONTH</span>
              <span className="font-display text-[34px] font-bold text-rust">{fmt(est.units)}</span>
            </div>

            <div className="mt-5 space-y-3">
              {est.byBand.map((b) => (
                <div key={b.key}>
                  <div className="flex justify-between font-mono text-[11px] text-ink/60">
                    <span>{b.label} · {fmt(b.count)} calls × {b.units}</span>
                    <span>{fmt(b.unitsUsed)} u</span>
                  </div>
                  <div className="mt-1 h-2 rounded-sm bg-ink/10">
                    <div className="h-2 rounded-sm bg-rust" style={{ width: `${(b.unitsUsed / maxUnits) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-mono text-[11px] text-ink/50">
                <span>No SIM · {fmt(est.heldNoSim)} calls held</span>
                <span>0 u</span>
              </div>
            </div>

            <div className="mt-6 border-t border-ink/14 pt-4">
              {est.costs.map(({ plan, cost }) => (
                <div key={plan.id} className={`flex justify-between py-1.5 font-mono text-xs ${est.best?.plan.id === plan.id ? 'font-semibold text-rust' : 'text-ink/70'}`}>
                  <span>{plan.name}</span>
                  <span>
                    {plan.monthly === null ? 'contact us' : cost === null ? `over ${fmt(plan.included)} u limit` : `${fmt(cost)} DZD`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Per-signal unit costs */}
      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)] pb-[clamp(70px,10vw,120px)]">
        <div className="font-mono text-[10px] tracking-[0.2em] text-ink/45">WHAT A UNIT BUYS</div>
        <h2 className="mt-3 font-display text-[clamp(22px,2.6vw,32px)] font-bold tracking-[-0.02em]">Each CAMARA signal has a fixed unit cost.</h2>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink/65">
          The agent only buys the signals a transaction needs, so the band totals above are typical spends, not fixed prices.
        </p>
        <div className="mt-6 overflow-x-auto rounded border border-ink/18 bg-white/40">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/14 font-mono text-[10px] tracking-[0.16em] text-ink/50">
                <th className="px-5 py-3 font-normal">SIGNAL</th>
                <th className="px-5 py-3 font-normal">TOOL ID</th>
                <th className="px-5 py-3 text-right font-normal">UNITS</th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.map(([name, id, units]) => (
                <tr key={id} className="border-b border-ink/8 last:border-0">
                  <td className="px-5 py-3">{name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink/55">{id}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-rust">{units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
