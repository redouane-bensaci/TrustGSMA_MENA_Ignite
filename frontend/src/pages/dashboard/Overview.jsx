import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { VC, fmt } from '../../lib/trace'

const BANDS = ['APPROVE', 'REVIEW', 'HOLD', 'REJECT']

export default function Overview() {
  const [txs, setTxs] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    api
      .listTransactions({ limit: 100 })
      .then(setTxs)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])

  const stats = useMemo(() => {
    if (!txs) return null
    const counts = { APPROVE: 0, REVIEW: 0, HOLD: 0, REJECT: 0 }
    let totalUnits = 0
    txs.forEach((t) => {
      const d = t.response?.verdict?.decision
      if (d && counts[d] !== undefined) counts[d] += 1
      totalUnits += t.response?.verdict?.cost_units_spent || 0
    })
    const avgUnits = txs.length ? (totalUnits / txs.length).toFixed(1) : '0.0'
    const needsAttention = counts.REVIEW + counts.HOLD
    return { counts, avgUnits, total: txs.length, needsAttention }
  }, [txs])

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · OVERVIEW</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Today, at a glance.
      </h1>

      {error ? (
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
          Couldn't reach the API ({error}). Is the backend running?
        </p>
      ) : null}

      {stats ? (
        <>
          <p className="mt-2 text-sm text-ink/60">
            {stats.total} verdict{stats.total === 1 ? '' : 's'} recorded
            {stats.needsAttention > 0 ? (
              <>
                {' '}
                · <span className="font-semibold text-rust">{stats.needsAttention} need{stats.needsAttention === 1 ? 's' : ''} attention</span>
              </>
            ) : null}
          </p>

          <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {BANDS.map((band) => (
              <div key={band} className="rounded border border-ink/14 bg-white/40 p-4">
                <div
                  className="font-mono text-[10px] tracking-[0.16em]"
                  style={{ color: VC[band] }}
                >
                  {band}
                </div>
                <div className="mt-1.5 font-display text-3xl font-bold text-ink">{stats.counts[band]}</div>
              </div>
            ))}
            <div className="rounded border border-ink/14 bg-panel p-4">
              <div className="font-mono text-[10px] tracking-[0.16em] text-cream/45">AVG UNITS SPENT</div>
              <div className="mt-1.5 font-display text-3xl font-bold text-cream">{stats.avgUnits}</div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">Live feed</h2>
            <Link to="/dashboard/transactions" className="font-mono text-xs text-rust hover:text-rust-dark">
              VIEW ALL →
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {txs.slice(0, 8).map((t) => {
              const v = t.response?.verdict
              const decision = v?.decision
              return (
                <Link
                  key={t.id}
                  to={`/dashboard/transactions/${t.id}`}
                  className="flex flex-wrap items-center gap-3 rounded border border-ink/12 bg-white/30 px-4 py-3 no-underline transition-colors hover:border-ink/30"
                >
                  <span
                    className="rounded-sm border-2 px-2 py-0.5 font-mono text-[10px] font-bold"
                    style={{ borderColor: VC[decision], color: VC[decision] }}
                  >
                    {decision}
                  </span>
                  <span className="font-mono text-[12.5px] text-ink">
                    {fmt(t.event?.amount?.value || 0)} {t.event?.amount?.currency}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink/45">{t.event?.counterparty?.msisdn}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink/35">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                </Link>
              )
            })}
            {txs.length === 0 ? (
              <div className="rounded border border-dashed border-ink/20 p-6 text-center font-mono text-xs text-ink/40">
                // no verdicts yet — run a transaction in the{' '}
                <Link to="/playground" className="text-rust">
                  playground
                </Link>
              </div>
            ) : null}
          </div>
        </>
      ) : !error ? (
        <div className="mt-8 h-40 animate-pulse rounded bg-ink/5" />
      ) : null}
    </div>
  )
}
