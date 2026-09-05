import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { VC, fmt } from '../../lib/trace'

export default function TransactionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tx, setTx] = useState(null)
  const [error, setError] = useState(null)
  const [showRaw, setShowRaw] = useState(false)
  const [replaying, setReplaying] = useState(false)

  const load = () => {
    api
      .getTransaction(id)
      .then(setTx)
      .catch((e) => setError(e.message))
  }

  useEffect(load, [id])

  const replay = async () => {
    if (!tx) return
    setReplaying(true)
    try {
      const res = await api.verify({
        ...tx.event,
        idempotency_key: `replay_${Date.now()}`,
      })
      navigate(`/dashboard/transactions/${res.transaction_id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setReplaying(false)
    }
  }

  if (error) {
    return (
      <div>
        <Link to="/dashboard/transactions" className="font-mono text-xs text-ink/50 hover:text-rust">
          ← back to transactions
        </Link>
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
          Couldn't load this transaction ({error}).
        </p>
      </div>
    )
  }

  if (!tx) return <div className="h-40 animate-pulse rounded bg-ink/5" />

  const v = tx.response.verdict
  const mi = tx.response.merchant_instruction
  const color = VC[v.decision]

  return (
    <div>
      <Link to="/dashboard/transactions" className="font-mono text-xs text-ink/50 hover:text-rust">
        ← back to transactions
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="rounded border-[3px] px-4 py-2 font-display text-2xl font-extrabold tracking-tight"
            style={{ borderColor: color, color }}
          >
            {v.decision}
          </span>
          <div>
            <div className="font-mono text-[11px] text-ink/40">{tx.id}</div>
            <div className="font-mono text-xs text-ink/50">{new Date(tx.timestamp).toLocaleString()}</div>
          </div>
        </div>
        <button
          onClick={replay}
          disabled={replaying}
          className="cursor-pointer rounded-sm border border-ink px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {replaying ? 'REPLAYING…' : '↻ REPLAY'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded border border-ink/14 bg-white/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.16em] text-ink/40">AMOUNT</div>
          <div className="mt-1 font-mono text-lg text-ink">
            {fmt(tx.event.amount.value)} {tx.event.amount.currency}
          </div>
        </div>
        <div className="rounded border border-ink/14 bg-white/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.16em] text-ink/40">COST UNITS</div>
          <div className="mt-1 font-mono text-lg text-ink">
            {v.cost_units_spent} / {v.budget_allocated}
          </div>
        </div>
        <div className="rounded border border-ink/14 bg-white/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.16em] text-ink/40">LATENCY</div>
          <div className="mt-1 font-mono text-lg text-ink">{v.latency_ms}ms</div>
        </div>
      </div>

      <div className="mt-6 rounded border border-ink/14 bg-panel p-5">
        <p className="text-sm leading-relaxed text-cream/85">{mi.summary}</p>
        <p className="mt-2 font-mono text-xs text-cream/50">{mi.recommended_action}</p>
        {v.override_rule_fired ? (
          <p className="mt-3 rounded-sm bg-rust/15 px-3 py-2 font-mono text-[11px] text-rust-soft">
            {v.override_rule_fired}
          </p>
        ) : null}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold tracking-[-0.01em]">Signal-by-signal breakdown</h2>
      <div className="mt-3 flex flex-col gap-2">
        {v.signals.map((s) => (
          <div key={s.name} className="rounded border border-ink/14 bg-white/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[13px] font-semibold text-ink">{s.name}</span>
              <span
                className="rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.06em]"
                style={{
                  background: s.status === 'pass' ? 'rgba(143,191,159,0.16)' : s.status === 'fail' ? 'rgba(178,58,42,0.16)' : 'rgba(216,178,90,0.18)',
                  color: s.status === 'pass' ? '#2f6d51' : s.status === 'fail' ? '#b23a2a' : '#8a6a1a',
                }}
              >
                {s.status.toUpperCase()}
              </span>
              <span className="font-mono text-[11px] text-ink/40">weight {s.weight}</span>
              <span className="font-mono text-[11px] text-ink/40">{s.cost_units} unit{s.cost_units === 1 ? '' : 's'}</span>
            </div>
            {s.details && Object.keys(s.details).length > 0 ? (
              <pre className="mt-2.5 overflow-x-auto rounded-sm bg-ink/5 p-2.5 font-mono text-[11px] text-ink/60">
                {JSON.stringify(s.details, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="cursor-pointer rounded-sm border border-ink/25 bg-transparent px-4 py-2 font-mono text-[11px] tracking-[0.1em] text-ink/60 hover:border-ink"
        >
          {showRaw ? 'HIDE RAW JSON' : 'SHOW RAW JSON'}
        </button>
        {showRaw ? (
          <pre className="mt-3 overflow-x-auto rounded bg-panel p-4 font-mono text-[11.5px] leading-relaxed text-cream">
            {JSON.stringify(tx, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  )
}
