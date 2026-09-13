import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, BASE_URL } from '../lib/api'
import { VC } from '../lib/trace'

const CHANNELS = ['playground', 'api', 'plugin']
const EVENT_TYPES = ['transfer', 'order_placement', 'disbursement', 'refund', 'account_update']

const HISTORY_KEY = 'trust_playground_history'

const DEFAULTS = {
  bindingId: 'bb_default_retail',
  amount: 42000,
  currency: 'DZD',
  msisdn: '+213661112233',
  declaredName: '',
  cell: '16-ALG',
  // Declared coordinates are optional, but supplying them is what lets the
  // agent buy Location Retrieval — it needs a point to measure the
  // device's actual position against. 16-ALG = central Algiers.
  latitude: 36.7372,
  longitude: 3.0865,
  channel: 'playground',
  eventType: 'transfer',
}

const SCENARIOS = [
  {
    id: 'A',
    label: 'A · Routine Payroll',
    tag: 'CLEAN PASS',
    hint: 'Cheap questions, clean answers — closes at 2/3 units.',
    values: {
      bindingId: 'bb_default_retail',
      amount: 42000,
      currency: 'DZD',
      msisdn: '+99999991001',
      declaredName: 'Amine Hadj',
      cell: '16-ALG',
      latitude: 36.7372,
      longitude: 3.0865,
      channel: 'playground',
      eventType: 'transfer',
    },
  },
  {
    id: 'B',
    label: 'B · SIM Swap Takeover',
    tag: 'RULE 2 · HOLD',
    hint: 'SIM swapped <24h ago + 412km location mismatch.',
    values: {
      bindingId: 'bb_ecommerce_store_02',
      amount: 184000,
      currency: 'DZD',
      msisdn: '+99999991000',
      declaredName: 'Yacine Mansouri',
      cell: '31-ORN',
      // Deliberately no coordinates: this scenario is the SIM-swap HOLD
      // story, decided on cell-level evidence alone. Scenario G is the
      // same counterparty *with* coordinates, which lets the agent buy
      // Location Retrieval and push the same case past HOLD into REJECT.
      latitude: '',
      longitude: '',
      channel: 'playground',
      eventType: 'transfer',
    },
  },
  {
    id: 'C',
    label: 'C · Fake Check / Dead SIM',
    tag: 'RULE 3 · REJECT',
    hint: 'Dead SIM + recycled number + cross-tenant reuse.',
    values: {
      bindingId: 'bb_algeria_fintech_01',
      amount: 75000,
      currency: 'DZD',
      msisdn: '+213770990011',
      declaredName: 'Karim Benali',
      cell: '25-CST',
      latitude: 36.365,
      longitude: 6.6147,
      channel: 'playground',
      eventType: 'disbursement',
    },
  },
  {
    id: 'D',
    label: 'D · Carrier Timeout',
    tag: 'UNCERTAIN',
    hint: 'Carrier signals unavailable — confidence downgrades.',
    values: {
      bindingId: 'bb_default_retail',
      amount: 20000,
      currency: 'DZD',
      msisdn: '+99999990504',
      declaredName: 'Samir Touati',
      cell: '16-ALG',
      latitude: 36.7372,
      longitude: 3.0865,
      channel: 'playground',
      eventType: 'transfer',
    },
  },
  {
    id: 'E',
    label: 'E · Strict Policy Holds It',
    tag: 'STRICT · HOLD',
    hint: 'Same evidence as F — a strict fintech policy pauses it for review.',
    pairId: 'kyc-mismatch-policy',
    values: {
      bindingId: 'bb_algeria_fintech_01',
      amount: 65000,
      currency: 'DZD',
      msisdn: '+213555221100',
      declaredName: 'Nadia Cherif',
      cell: '16-ALG',
      latitude: 36.7372,
      longitude: 3.0865,
      channel: 'playground',
      eventType: 'disbursement',
    },
  },
  {
    id: 'F',
    label: 'F · Lenient Policy Clears It',
    tag: 'MODERATE · APPROVE',
    hint: 'Identical transaction, identical signals — a moderate-appetite merchant lets it through.',
    pairId: 'kyc-mismatch-policy',
    values: {
      bindingId: 'bb_ecommerce_store_02',
      amount: 65000,
      currency: 'DZD',
      msisdn: '+213555221100',
      declaredName: 'Nadia Cherif',
      cell: '16-ALG',
      latitude: 36.7372,
      longitude: 3.0865,
      channel: 'playground',
      eventType: 'disbursement',
    },
  },
  {
    id: 'G',
    label: 'G · Location Retrieval Decides It',
    tag: 'RETRIEVAL · REJECT',
    hint: 'Same case as B, plus declared coordinates — the agent buys the handset’s real position and the 351 km gap settles it.',
    values: {
      bindingId: 'bb_ecommerce_store_02',
      amount: 184000,
      currency: 'DZD',
      msisdn: '+99999991000',
      declaredName: 'Yacine Mansouri',
      cell: '31-ORN',
      latitude: 35.6971,
      longitude: -0.6308,
      channel: 'playground',
      eventType: 'transfer',
    },
  },
  {
    id: 'H',
    label: 'H · Computer User / No SIM',
    tag: 'NO SIM · HOLD',
    hint: 'Reserved number +00000000000 — no SIM to test, so it is held by default with zero units spent.',
    values: {
      bindingId: 'bb_default_retail',
      amount: 12000,
      currency: 'DZD',
      msisdn: '+00000000000',
      declaredName: 'Desktop Customer',
      cell: '',
      latitude: '',
      longitude: '',
      channel: 'playground',
      eventType: 'order_placement',
    },
  },
]

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

function bandFor(amount, binding) {
  const bands = binding?.value_bands || { routine: [0, 15000], elevated: [15001, 60000], critical: [60001, null] }
  const val = Number(amount) || 0
  const critFloor = bands.critical?.[0] ?? 60001
  const elevFloor = bands.elevated?.[0] ?? 15001
  if (val >= critFloor) return { name: 'Critical', units: 8, color: '#e8877a' }
  if (val >= elevFloor) return { name: 'Elevated', units: 5, color: '#d8b25a' }
  return { name: 'Routine', units: 3, color: '#8fbf9f' }
}

const STATUS_STYLE = {
  pass: { bg: 'rgba(143,191,159,0.16)', fg: '#8fbf9f' },
  uncertain: { bg: 'rgba(216,178,90,0.18)', fg: '#d8b25a' },
  fail: { bg: 'rgba(178,58,42,0.2)', fg: '#e8877a' },
  not_applicable: { bg: 'rgba(232,228,216,0.10)', fg: 'rgba(232,228,216,0.5)' },
}

function SignalRow({ signal, index, totalLatency, totalCost }) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLE[signal.status] || STATUS_STYLE.not_applicable
  // Signals don't carry their own latency from the API — approximate each
  // one's share of the total call latency by its cost weight so the timeline
  // still reads as "turn by turn", labelled as an estimate below.
  const share = totalCost > 0 ? signal.cost_units / totalCost : 1 / Math.max(totalLatency ? 1 : 1, 1)
  const estLatency = Math.max(20, Math.round(totalLatency * share))
  const details = signal.details && Object.keys(signal.details).length ? signal.details : null
  const expandable = Boolean(details)

  return (
    <div className="border-b border-cream/10 last:border-b-0">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-cream/35">{String(index + 1).padStart(2, '0')}</span>
            <span className="truncate font-mono text-[11.5px] text-cream/70">{signal.name}</span>
          </div>
          {signal.agent_reason ? (
            <p className="pl-[26px] text-[11px] italic leading-snug text-cream/45">“{signal.agent_reason}”</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="font-mono text-[10px] text-cream/40">{signal.cost_units}u · ~{estLatency}ms</span>
          <span
            className="rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em]"
            style={{ background: style.bg, color: style.fg }}
          >
            {signal.status.toUpperCase()}
          </span>
          {expandable ? (
            <span className={`font-mono text-[10px] text-cream/35 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
          ) : null}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && details ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 rounded-sm bg-black/25 p-3 font-mono text-[11px] leading-relaxed text-cream/60">
              {Object.entries(details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-cream/40">{k}</span>
                  <span className="text-cream/75">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default function Playground() {
  const [bindings, setBindings] = useState([])
  const [bindingId, setBindingId] = useState(DEFAULTS.bindingId)
  const [amount, setAmount] = useState(DEFAULTS.amount)
  const [currency, setCurrency] = useState(DEFAULTS.currency)
  const [msisdn, setMsisdn] = useState(DEFAULTS.msisdn)
  const [declaredName, setDeclaredName] = useState(DEFAULTS.declaredName)
  const [cell, setCell] = useState(DEFAULTS.cell)
  const [latitude, setLatitude] = useState(DEFAULTS.latitude)
  const [longitude, setLongitude] = useState(DEFAULTS.longitude)
  const [channel, setChannel] = useState(DEFAULTS.channel)
  const [eventType, setEventType] = useState(DEFAULTS.eventType)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeScenario, setActiveScenario] = useState(null)
  const [showDev, setShowDev] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lastRequest, setLastRequest] = useState(null)
  const [historyPreview, setHistoryPreview] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  useEffect(() => {
    api
      .listBindings()
      .then(setBindings)
      .catch(() => setBindings([]))
  }, [])

  // Same server-side, anti-tampering lookup the agent itself uses — lets a
  // tester see what history the agent will reason from *before* running a
  // verification, not just guess from the outcome. Debounced so typing a
  // number doesn't fire a request per keystroke.
  useEffect(() => {
    if (!msisdn || msisdn.trim().length < 6) {
      setHistoryPreview(null)
      setHistoryError(null)
      return
    }
    setHistoryLoading(true)
    setHistoryError(null)
    const handle = setTimeout(() => {
      api
        .getCounterpartyHistory(msisdn.trim())
        .then((h) => setHistoryPreview(h))
        .catch((err) => {
          setHistoryPreview(null)
          setHistoryError(err.message)
        })
        .finally(() => setHistoryLoading(false))
    }, 400)
    return () => clearTimeout(handle)
  }, [msisdn])

  const activeBinding = useMemo(
    () => bindings.find((b) => b.id === bindingId) || null,
    [bindings, bindingId]
  )
  const band = useMemo(() => bandFor(amount, activeBinding), [amount, activeBinding])

  const applyScenario = (scenario) => {
    const v = scenario.values
    setBindingId(v.bindingId)
    setAmount(v.amount)
    setCurrency(v.currency)
    setMsisdn(v.msisdn)
    setDeclaredName(v.declaredName)
    setCell(v.cell)
    setLatitude(v.latitude ?? '')
    setLongitude(v.longitude ?? '')
    setChannel(v.channel)
    setEventType(v.eventType)
    setActiveScenario(scenario.id)
    setResult(null)
    setError(null)
  }

  const resetForm = () => {
    setBindingId(DEFAULTS.bindingId)
    setAmount(DEFAULTS.amount)
    setCurrency(DEFAULTS.currency)
    setMsisdn(DEFAULTS.msisdn)
    setDeclaredName(DEFAULTS.declaredName)
    setCell(DEFAULTS.cell)
    setLatitude(DEFAULTS.latitude)
    setLongitude(DEFAULTS.longitude)
    setChannel(DEFAULTS.channel)
    setEventType(DEFAULTS.eventType)
    setActiveScenario(null)
    setResult(null)
    setError(null)
  }

  const buildPayload = () => ({
    event_type: eventType,
    amount: { value: Number(amount), currency },
    counterparty: {
      msisdn,
      declared_name: declaredName || undefined,
      // Coordinates ride along with the cell when supplied — Location
      // Verification uses them for the live CAMARA area check, and
      // Location Retrieval measures the device's real position against
      // them. Blank inputs are omitted rather than sent as NaN.
      declared_location:
        cell || latitude !== '' || longitude !== ''
          ? {
              ...(cell ? { cell } : {}),
              ...(latitude !== '' && !Number.isNaN(Number(latitude))
                ? { latitude: Number(latitude) }
                : {}),
              ...(longitude !== '' && !Number.isNaN(Number(longitude))
                ? { longitude: Number(longitude) }
                : {}),
            }
          : undefined,
    },
    channel,
    idempotency_key: `pg_${Date.now()}`,
    business_binding_id: bindingId,
  })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const payload = buildPayload()
    setLastRequest(payload)
    try {
      const res = await api.verify(payload)
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
  const curlCommand = `curl -sS -X POST '${BASE_URL}/v1/verify' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(lastRequest || buildPayload(), null, 2)}'`

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const totalCost = result?.verdict.signals.reduce((sum, s) => sum + s.cost_units, 0) || 0
  const spentPct = result ? Math.min(100, (result.verdict.cost_units_spent / result.verdict.budget_allocated) * 100) : 0

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

      <section className="border-t border-ink/14 py-5">
        <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-ink/45">ONE-CLICK TEST VECTORS</div>
        <div className="flex flex-wrap gap-2.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => applyScenario(s)}
              className={`group flex flex-col items-start gap-0.5 rounded-sm border px-3.5 py-2.5 text-left transition-colors ${
                activeScenario === s.id ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 text-ink hover:border-ink'
              }`}
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.06em]">{s.label}</span>
              <span
                className={`font-mono text-[9.5px] tracking-[0.1em] ${
                  activeScenario === s.id ? 'text-paper/60' : 'text-ink/40'
                }`}
              >
                {s.tag}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={resetForm}
            className="rounded-sm border border-dashed border-ink/30 px-3.5 py-2.5 font-mono text-[11px] tracking-[0.06em] text-ink/55 hover:border-ink hover:text-ink"
          >
            ↺ Reset / Custom
          </button>
        </div>
        {activeScenario ? (
          <p className="mt-2 font-mono text-[11px] text-ink/45">
            {SCENARIOS.find((s) => s.id === activeScenario)?.hint}
            {SCENARIOS.find((s) => s.id === activeScenario)?.pairId ? (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => {
                    const current = SCENARIOS.find((s) => s.id === activeScenario)
                    const pair = SCENARIOS.find((s) => s.pairId === current.pairId && s.id !== current.id)
                    if (pair) applyScenario(pair)
                  }}
                  className="underline decoration-dotted text-ink/60 hover:text-ink"
                >
                  Run the {activeScenario === 'E' ? 'lenient' : 'strict'} counterpart →
                </button>
              </>
            ) : null}
          </p>
        ) : null}
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

            <div
              className="-mt-1.5 flex items-center gap-2 rounded-sm px-3 py-2 font-mono text-[10.5px] tracking-[0.06em]"
              style={{ background: `${band.color}22`, color: band.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: band.color }} />
              {band.name} band · {band.units} cost units allocated
              {activeBinding ? '' : ' (default bands)'}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">DECLARED LEGAL NAME</span>
              <input
                type="text"
                placeholder="e.g. Amine Hadj"
                value={declaredName}
                onChange={(e) => setDeclaredName(e.target.value)}
                className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">COUNTERPARTY MSISDN</span>
              <input
                type="text"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
              />
            </label>

            {historyLoading ? (
              <p className="font-mono text-[10.5px] text-ink/35">Looking up customer history…</p>
            ) : historyPreview ? (
              <div className="rounded-sm border border-ink/14 bg-ink/[0.03] px-3.5 py-2.5">
                <div className="font-mono text-[9.5px] tracking-[0.16em] text-ink/40">
                  KNOWN HISTORY FOR THIS NUMBER — same lookup the agent uses
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-ink/65">
                  <span>first seen: {historyPreview.first_seen}</span>
                  <span>prior transactions: {historyPreview.prior_transactions}</span>
                  <span>
                    prior verdicts:{' '}
                    {historyPreview.prior_verdicts.length ? historyPreview.prior_verdicts.join(', ') : 'none'}
                  </span>
                  <span>seen across tenants: {historyPreview.msisdn_seen_across_tenants}</span>
                  {historyPreview.portable_trust_score != null ? (
                    <span>portable trust score: {historyPreview.portable_trust_score}</span>
                  ) : null}
                </div>
              </div>
            ) : historyError ? (
              <p className="font-mono text-[10.5px] text-rust-dark/70">Couldn't look up history ({historyError}).</p>
            ) : null}

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

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">DECLARED LATITUDE</span>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="optional"
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">DECLARED LONGITUDE</span>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="optional"
                  className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
                />
              </label>
            </div>
            <p className="-mt-1 font-mono text-[10.5px] leading-relaxed text-ink/45">
              Coordinates are optional. Supplying them lets the agent buy Location Retrieval — the
              device's actual network position, measured against this point — not just a yes/no
              check against the declared cell.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">EVENT / TRANSACTION TYPE</span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 cursor-pointer rounded-sm bg-ink px-6 py-3.5 font-mono text-xs font-semibold tracking-[0.16em] text-paper transition-colors hover:bg-rust disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                  VERIFYING…
                </span>
              ) : (
                'RUN VERIFICATION'
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDev((v) => !v)}
              className="rounded-sm border border-ink/20 px-4 py-2 font-mono text-[10.5px] tracking-[0.1em] text-ink/60 hover:border-ink hover:text-ink"
            >
              {showDev ? '▾ HIDE CURL & JSON' : '▸ CURL & JSON PREVIEW'}
            </button>

            <AnimatePresence initial={false}>
              {showDev ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-sm border border-ink/20 bg-ink p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-cream/45">
                        {lastRequest ? 'LAST REQUEST' : 'PENDING REQUEST (preview)'}
                      </span>
                      <button
                        type="button"
                        onClick={copyCurl}
                        className="rounded-sm border border-cream/25 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-cream/75 hover:border-cream"
                      >
                        {copied ? 'COPIED ✓' : 'COPY CURL'}
                      </button>
                    </div>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-cream/65">
{curlCommand}
                    </pre>
                    {result ? (
                      <>
                        <div className="mb-2 mt-3 border-t border-cream/10 pt-3 font-mono text-[10px] tracking-[0.14em] text-cream/45">
                          RESPONSE JSON
                        </div>
                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-cream/65">
{JSON.stringify(result, null, 2)}
                        </pre>
                      </>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <p className="text-xs leading-relaxed text-ink/45">
              Try <code className="text-ink/60">+99999991000</code> (Nokia NaC sandbox: SIM swap + KYC
              mismatch), <code className="text-ink/60">+213770990011</code> (cross-tenant reuse, dead SIM —
              mock-only signals), or <code className="text-ink/60">+99999990504</code> (Nokia NaC sandbox:
              carrier gateway timeout) to see it escalate.
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
                  exit={{ opacity: 0, y: -8 }}
                  className="overflow-hidden rounded border border-ink bg-panel p-6"
                >
                  {/* ---- 1. FINAL VERDICT ------------------------------------------ */}
                  <div className="font-mono text-[9.5px] tracking-[0.18em] text-cream/35">FINAL VERDICT</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-4">
                    <span
                      className="rounded border-[3px] px-4 py-2 font-display text-2xl font-extrabold tracking-tight"
                      style={{ borderColor: badgeColor, color: badgeColor }}
                    >
                      {result.verdict.decision}
                    </span>
                    <span className="font-mono text-xs text-cream/60">
                      score {result.verdict.score} · confidence {result.verdict.confidence} · {result.verdict.latency_ms}ms
                    </span>
                  </div>

                  {/* ---- 2. IN PLAIN TERMS — the direct, non-technical explanation -- */}
                  <div className="mt-5 rounded-sm border border-cream/15 bg-cream/[0.05] p-4">
                    <div className="font-mono text-[9.5px] tracking-[0.18em] text-cream/40">
                      IN PLAIN TERMS — WHAT THIS MEANS FOR YOU
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-cream/85">{result.merchant_instruction.summary}</p>
                    <p className="mt-2 font-mono text-xs text-cream/55">→ {result.merchant_instruction.recommended_action}</p>
                  </div>

                  {/* ---- 3. COST & REASONING TRACE — technical, internal to the agent */}
                  <div className="mt-5 border-t border-cream/10 pt-4">
                    <div className="font-mono text-[9.5px] tracking-[0.18em] text-cream/35">
                      TECHNICAL — AGENT COST &amp; REASONING (not shown to the merchant)
                    </div>

                    {result.verdict.override_rule_fired ? (
                      <div className="mt-3 rounded-sm border border-ink/25 bg-ink/[0.35] px-3.5 py-3">
                        <div className="font-mono text-[10px] tracking-[0.14em] text-cream/50">
                          DETERMINISTIC SAFETY FLOOR ENGAGED
                        </div>
                        <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-cream/75">
                          {result.verdict.override_rule_fired}
                        </p>
                        <p className="mt-1 text-[11px] text-cream/45">
                          This override clamps the composite score directly, ahead of policy or model reasoning — it
                          is why the verdict above landed where it did.
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] tracking-[0.1em] text-cream/45">
                      <span>COST BUDGET</span>
                      <span>
                        SPENT {result.verdict.cost_units_spent} / {result.verdict.budget_allocated} UNITS
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-cream/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${spentPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: spentPct >= 90 ? '#e8877a' : spentPct >= 60 ? '#d8b25a' : '#8fbf9f',
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.verdict.signals.map((s) => (
                        <span
                          key={s.name}
                          className="rounded-sm bg-cream/[0.06] px-2 py-0.5 font-mono text-[10px] text-cream/50"
                        >
                          {s.name} · {s.cost_units}u
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 mb-1 font-mono text-[10.5px] tracking-[0.1em] text-cream/45">
                      WHY EACH SIGNAL WAS BOUGHT, TURN BY TURN
                    </div>
                    <div className="flex flex-col">
                      {result.verdict.signals.map((s, i) => (
                        <SignalRow
                          key={s.name}
                          signal={s}
                          index={i}
                          totalLatency={result.verdict.latency_ms}
                          totalCost={totalCost}
                        />
                      ))}
                    </div>

                    {result.counterparty_history ? (
                      <div className="mt-4 border-t border-cream/10 pt-3">
                        <div className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-cream/45">
                          COUNTERPARTY HISTORY THE AGENT SAW
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-cream/60">
                          <span>first seen: {result.counterparty_history.first_seen}</span>
                          <span>prior transactions: {result.counterparty_history.prior_transactions}</span>
                          <span>
                            prior verdicts:{' '}
                            {result.counterparty_history.prior_verdicts.length
                              ? result.counterparty_history.prior_verdicts.join(', ')
                              : 'none'}
                          </span>
                          <span>seen across tenants: {result.counterparty_history.msisdn_seen_across_tenants}</span>
                          {result.counterparty_history.portable_trust_score != null ? (
                            <span>portable trust score: {result.counterparty_history.portable_trust_score}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-cream/40">
                          Looked up server-side by MSISDN — the caller can never supply or override this; it's the
                          same data the agent weighed alongside the network signals above.
                        </p>
                      </div>
                    ) : null}
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
