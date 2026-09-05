import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'

const SECTORS = [
  { id: 'retail_physical', label: 'Retail (physical goods)' },
  { id: 'ecommerce_marketplace', label: 'E-commerce marketplace' },
  { id: 'banking_fintech', label: 'Banking / fintech' },
  { id: 'logistics_delivery', label: 'Logistics / delivery' },
]

const SETTLEMENTS = [
  { id: 'cash_on_delivery', label: 'Cash on delivery' },
  { id: 'instant_wire', label: 'Instant wire / transfer' },
  { id: 'card_on_file', label: 'Card on file' },
]

const TRANSACTION_TYPES = [
  'order_placement',
  'transfer',
  'disbursement',
  'refund',
  'onboarding',
  'withdrawal',
]

const THREATS = [
  'fake_orders',
  'identity_misuse',
  'account_takeover',
  'unauthorized_disbursement',
  'sim_swap_fraud',
  'ghost_orders',
]

const RISK_APPETITES = [
  { id: 'conservative_above_elevated', label: 'Conservative above elevated', desc: 'Escalate quickly once a transaction leaves the routine band.' },
  { id: 'moderate', label: 'Moderate', desc: 'Balance friction against approval rate.' },
  { id: 'strict', label: 'Strict', desc: 'Escalate aggressively — false positives are cheaper than fraud here.' },
]

const FRICTION_POLICIES = [
  { id: 'invisible_to_customer', label: 'Invisible to customer', desc: 'Never show a challenge; hold silently and route to review.' },
  { id: 'step_up_on_review', label: 'Step-up on review', desc: 'Ask for secondary confirmation only when REVIEW fires.' },
  { id: 'always_confirm', label: 'Always confirm', desc: 'Confirm every transaction above the routine band.' },
]

const STEPS = ['Sector', 'Value bands', 'Threats', 'Risk appetite', 'Review']

export default function Onboarding() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [sector, setSector] = useState('retail_physical')
  const [transactionTypes, setTransactionTypes] = useState(['order_placement'])
  const [settlement, setSettlement] = useState('cash_on_delivery')
  const [bands, setBands] = useState({ routine: [0, 15000], elevated: [15001, 60000], critical: [60001, null] })
  const [threats, setThreats] = useState(['fake_orders', 'identity_misuse'])
  const [riskAppetite, setRiskAppetite] = useState('conservative_above_elevated')
  const [frictionPolicy, setFrictionPolicy] = useState('invisible_to_customer')

  const toggleThreat = (t) =>
    setThreats((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const toggleTransactionType = (t) =>
    setTransactionTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const updateBand = (band, idx, value) =>
    setBands((b) => {
      const arr = [...b[band]]
      arr[idx] = value === '' ? null : Number(value)
      return { ...b, [band]: arr }
    })

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.updateBinding(user.tenant_id, {
        sector,
        transaction_types: transactionTypes,
        settlement,
        value_bands: bands,
        declared_threats: threats,
        risk_appetite: riskAppetite,
        friction_policy: frictionPolicy,
      })
      await refresh()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · ONBOARDING</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Set up your business binding.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">
        This context is what the agent reasons against on every transaction — nothing is guessed at
        decision time.
      </p>

      <div className="mt-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-rust' : 'bg-ink/12'}`} />
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] tracking-[0.14em] text-ink/40">
        STEP {step + 1} / {STEPS.length} — {STEPS[step].toUpperCase()}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          {step === 0 ? (
            <div className="flex flex-col gap-5">
              <div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">SECTOR</span>
                <div className="mt-2 flex flex-col gap-2">
                  {SECTORS.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 transition-colors ${
                        sector === s.id ? 'border-ink bg-white/60' : 'border-ink/16 bg-white/30 hover:border-ink/40'
                      }`}
                    >
                      <input type="radio" checked={sector === s.id} onChange={() => setSector(s.id)} className="accent-rust" />
                      <span className="text-sm text-ink">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">TRANSACTION TYPES</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TRANSACTION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTransactionType(t)}
                      className={`cursor-pointer rounded-sm border px-3 py-2 font-mono text-[11.5px] tracking-[0.02em] transition-colors ${
                        transactionTypes.includes(t)
                          ? 'border-ink bg-ink/8 text-ink'
                          : 'border-ink/18 bg-white/30 text-ink/60 hover:border-ink/40'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink/45">Which kinds of transactions will actually hit /v1/verify.</p>
              </div>
              <div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">SETTLEMENT TYPE</span>
                <div className="mt-2 flex flex-col gap-2">
                  {SETTLEMENTS.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 transition-colors ${
                        settlement === s.id ? 'border-ink bg-white/60' : 'border-ink/16 bg-white/30 hover:border-ink/40'
                      }`}
                    >
                      <input type="radio" checked={settlement === s.id} onChange={() => setSettlement(s.id)} className="accent-rust" />
                      <span className="text-sm text-ink">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['routine', 'elevated', 'critical'].map((band) => (
                <div key={band} className="rounded border border-ink/16 bg-white/40 p-4">
                  <div className="font-mono text-[10px] tracking-[0.14em] text-ink/45">{band.toUpperCase()}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="number"
                      value={bands[band][0] ?? ''}
                      onChange={(e) => updateBand(band, 0, e.target.value)}
                      className="w-full rounded-sm border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-rust"
                    />
                    <span className="text-ink/30">–</span>
                    <input
                      type="number"
                      placeholder="∞"
                      value={bands[band][1] ?? ''}
                      onChange={(e) => updateBand(band, 1, e.target.value)}
                      className="w-full rounded-sm border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-rust"
                    />
                  </div>
                </div>
              ))}
              <p className="col-span-full mt-1 text-xs text-ink/45">
                DZD thresholds. These set the cost budget the agent allocates per transaction.
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">DECLARED THREATS</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {THREATS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleThreat(t)}
                    className={`cursor-pointer rounded-sm border px-3 py-2 font-mono text-[11.5px] tracking-[0.02em] transition-colors ${
                      threats.includes(t)
                        ? 'border-rust bg-rust/12 text-rust-dark'
                        : 'border-ink/18 bg-white/30 text-ink/60 hover:border-ink/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink/45">Pick every pattern that's actually hit you before.</p>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-6">
              <div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">RISK APPETITE</span>
                <div className="mt-2 flex flex-col gap-2">
                  {RISK_APPETITES.map((r) => (
                    <label
                      key={r.id}
                      className={`flex cursor-pointer flex-col gap-1 rounded border px-4 py-3 transition-colors ${
                        riskAppetite === r.id ? 'border-ink bg-white/60' : 'border-ink/16 bg-white/30 hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={riskAppetite === r.id} onChange={() => setRiskAppetite(r.id)} className="accent-rust" />
                        <span className="text-sm font-medium text-ink">{r.label}</span>
                      </div>
                      <span className="pl-6 text-xs text-ink/50">{r.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">FRICTION POLICY</span>
                <div className="mt-2 flex flex-col gap-2">
                  {FRICTION_POLICIES.map((f) => (
                    <label
                      key={f.id}
                      className={`flex cursor-pointer flex-col gap-1 rounded border px-4 py-3 transition-colors ${
                        frictionPolicy === f.id ? 'border-ink bg-white/60' : 'border-ink/16 bg-white/30 hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={frictionPolicy === f.id} onChange={() => setFrictionPolicy(f.id)} className="accent-rust" />
                        <span className="text-sm font-medium text-ink">{f.label}</span>
                      </div>
                      <span className="pl-6 text-xs text-ink/50">{f.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded border border-ink/16 bg-panel p-5 font-mono text-[12.5px] leading-relaxed text-cream/85">
                <div>sector: {sector}</div>
                <div>transaction_types: [{transactionTypes.join(', ')}]</div>
                <div>settlement: {settlement}</div>
                <div>
                  value_bands: routine {bands.routine[0]}–{bands.routine[1] ?? '∞'}, elevated {bands.elevated[0]}–
                  {bands.elevated[1] ?? '∞'}, critical {bands.critical[0]}–{bands.critical[1] ?? '∞'}
                </div>
                <div>declared_threats: [{threats.join(', ')}]</div>
                <div>risk_appetite: {riskAppetite}</div>
                <div>friction_policy: {frictionPolicy}</div>
              </div>
              {error ? <p className="text-sm text-rust-dark">{error}</p> : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-between">
        <button
          onClick={back}
          disabled={step === 0}
          className="cursor-pointer rounded-sm border border-ink/20 px-5 py-2.5 font-mono text-xs tracking-[0.1em] text-ink/60 hover:border-ink disabled:opacity-0"
        >
          ← BACK
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            className="cursor-pointer rounded-sm bg-ink px-6 py-2.5 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust"
          >
            CONTINUE →
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="cursor-pointer rounded-sm bg-rust px-6 py-2.5 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust-dark disabled:opacity-50"
          >
            {saving ? 'CREATING…' : 'FINISH SETUP'}
          </button>
        )}
      </div>
    </div>
  )
}
