import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { VC } from '../lib/trace'

const CHANNELS = ['playground', 'api', 'plugin']

const HISTORY_KEY = 'trust_playground_history'

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 25)))
}

export default function Playground() {
  const [bindings, setBindings] = useState([])
  const [bindingId, setBindingId] = useState('bb_default_retail')
  const [amount, setAmount] = useState(184000)
  const [currency, setCurrency] = useState('DZD')
  const [msisdn, setMsisdn] = useState('+213661448899')
  const [cell, setCell] = useState('31-ORN')
  const [channel, setChannel] = useState('playground')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .listBindings()
      .then(setBindings)
      .catch(() => setBindings([]))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.verify({
        event_type: 'transfer',
        amount: { value: Number(amount), currency },
        counterparty: { msisdn, declared_location: cell ? { cell } : undefined },
        channel,
        idempotency_key: `pg_${Date.now()}`,
        business_binding_id: bindingId,
      })
      setResult(res)
      const history = loadHistory()
      saveHistory([
        {
          id: res.transaction_id,
          amount: Number(amount),
          currency,
          msisdn,
          decision: res.verdict.decision,
          score: res.verdict.score,
          units: res.verdict.cost_units_spent,
          timestamp: res.timestamp,
        },
        ...history,
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const badgeColor = result ? VC[result.verdict.decision] || '#e8e4d8' : null

  return (
    <>
      <section className="pt-[clamp(38px,6vw,72px)] pb-[clamp(24px,3vw,36px)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">PLAYGROUND · TIER 1</div>
            <h1 className="m-0 max-w-[20ch] text-wrap-balance font-display text-[clamp(30px,4.4vw,52px)] font-extrabold tracking-[-0.03em]">
              No-code manual verification.
            </h1>
            <p className="mt-3 max-w-[58ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
              Pick a business profile, shape a transaction, and see the real agent decide — same
              endpoint, same budget maths as production. No signup required.
            </p>
          </div>
          <Link
            to="/playground/history"
            className="rounded-sm border border-ink/20 px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-ink no-underline hover:border-ink"
          >
            PAST CHECKS →
          </Link>
        </div>
      </section>

      <section className="border-t border-ink/14 py-[clamp(30px,4vw,48px)] pb-[clamp(70px,10vw,120px)]">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={submit} className="flex flex-col gap-4 rounded border border-ink/16 bg-white/40 p-6">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">BUSINESS PROFILE</span>
              <select
                value={bindingId}
                onChange={(e) => setBindingId(e.target.value)}
                className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              >
                {(bindings.length
                  ? bindings
                  : [{ id: 'bb_default_retail', business_name: 'Maghreb Express Retail' }]
                ).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.business_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">AMOUNT</span>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">CURRENCY</span>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">COUNTERPARTY MSISDN</span>
              <input
                type="text"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">DECLARED CELL</span>
                <input
                  type="text"
                  value={cell}
                  onChange={(e) => setCell(e.target.value)}
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">CHANNEL</span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 cursor-pointer rounded-sm bg-ink px-6 py-3.5 font-mono text-xs font-semibold tracking-[0.16em] text-paper transition-colors hover:bg-rust disabled:opacity-50"
            >
              {loading ? 'VERIFYING…' : 'RUN VERIFICATION'}
            </button>

            <p className="text-xs leading-relaxed text-ink/45">
              Try <code className="text-ink/60">+213661448899</code> (recent SIM swap),{' '}
              <code className="text-ink/60">+213770990011</code> (cross-tenant reuse), or{' '}
              <code className="text-ink/60">+213999000111</code> (carrier signals unavailable) to see it escalate.
            </p>
          </form>

          <div className="flex flex-col gap-4">
            {error ? (
              <div className="rounded border border-rust/30 bg-rust/[0.06] p-5 text-sm text-rust-dark">
                Couldn't reach the API ({error}). Is the backend running on port 8000?
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={result.transaction_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded border border-ink bg-panel p-6"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      className="rounded border-[3px] px-4 py-2 font-display text-2xl font-extrabold tracking-tight"
                      style={{ borderColor: badgeColor, color: badgeColor }}
                    >
                      {result.verdict.decision}
                    </span>
                    <span className="font-mono text-xs text-cream/60">
                      score {result.verdict.score} · {result.verdict.cost_units_spent}/{result.verdict.budget_allocated} units ·{' '}
                      {result.verdict.latency_ms}ms
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-cream/80">{result.merchant_instruction.summary}</p>
                  <p className="mt-2 font-mono text-xs text-cream/50">{result.merchant_instruction.recommended_action}</p>
                  {result.verdict.override_rule_fired ? (
                    <p className="mt-3 rounded-sm bg-rust/15 px-3 py-2 font-mono text-[11px] text-rust-soft">
                      {result.verdict.override_rule_fired}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-1.5 border-t border-cream/10 pt-4">
                    {result.verdict.signals.map((s) => (
                      <div key={s.name} className="flex items-center justify-between gap-3 font-mono text-[11.5px]">
                        <span className="text-cream/60">{s.name}</span>
                        <span
                          className="rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em]"
                          style={{
                            background:
                              s.status === 'pass'
                                ? 'rgba(143,191,159,0.16)'
                                : s.status === 'uncertain'
                                  ? 'rgba(216,178,90,0.18)'
                                  : 'rgba(178,58,42,0.2)',
                            color: s.status === 'pass' ? '#8fbf9f' : s.status === 'uncertain' ? '#d8b25a' : '#e8877a',
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded border border-dashed border-ink/20 p-6 text-center font-mono text-xs text-ink/35">
                  // run a verification to see the verdict
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  )
}
