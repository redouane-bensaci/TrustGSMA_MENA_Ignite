import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'

const RISK_APPETITES = ['conservative_above_elevated', 'moderate', 'strict']
const FRICTION_POLICIES = ['invisible_to_customer', 'step_up_on_review', 'always_confirm']
const TRANSACTION_TYPES = ['order_placement', 'transfer', 'disbursement', 'refund', 'onboarding', 'withdrawal']

export default function Settings() {
  const { user } = useAuth()
  const [binding, setBinding] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.tenant_id) return
    api
      .getBinding(user.tenant_id)
      .then(setBinding)
      .catch((e) => setError(e.message))
  }, [user])

  const update = (field, value) => setBinding((b) => ({ ...b, [field]: value }))
  const toggleTransactionType = (t) =>
    setBinding((b) => ({
      ...b,
      transaction_types: b.transaction_types.includes(t)
        ? b.transaction_types.filter((x) => x !== t)
        : [...b.transaction_types, t],
    }))
  const updateBand = (band, index, value) =>
    setBinding((b) => {
      const bands = { ...b.value_bands }
      const arr = [...bands[band]]
      arr[index] = value === '' ? null : Number(value)
      bands[band] = arr
      return { ...b, value_bands: bands }
    })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api.updateBinding(binding.id, binding)
      setBinding(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !binding) {
    return (
      <p className="rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
        Couldn't load tenant settings ({error}).
      </p>
    )
  }

  if (!binding) return <div className="h-40 animate-pulse rounded bg-ink/5" />

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · SETTINGS</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Tenant profile.
      </h1>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink/60">
        Revise the risk appetite and value bands set during onboarding. Changes apply to every
        verification from this moment on.
      </p>

      <form onSubmit={save} className="mt-6 flex max-w-[560px] flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">BUSINESS NAME</span>
          <input
            type="text"
            value={binding.business_name}
            onChange={(e) => update('business_name', e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          />
        </label>

        <div>
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">TRANSACTION TYPES</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRANSACTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTransactionType(t)}
                className={`cursor-pointer rounded-sm border px-3 py-2 font-mono text-[11.5px] tracking-[0.02em] transition-colors ${
                  binding.transaction_types.includes(t)
                    ? 'border-ink bg-ink/8 text-ink'
                    : 'border-ink/18 bg-white/30 text-ink/60 hover:border-ink/40'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">RISK APPETITE</span>
          <select
            value={binding.risk_appetite}
            onChange={(e) => update('risk_appetite', e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          >
            {RISK_APPETITES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">FRICTION POLICY</span>
          <select
            value={binding.friction_policy}
            onChange={(e) => update('friction_policy', e.target.value)}
            className="rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
          >
            {FRICTION_POLICIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">VALUE BANDS (DZD)</span>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {['routine', 'elevated', 'critical'].map((band) => (
              <div key={band} className="rounded border border-ink/14 bg-white/40 p-3">
                <div className="font-mono text-[10px] tracking-[0.1em] text-ink/45">{band.toUpperCase()}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="number"
                    value={binding.value_bands[band][0] ?? ''}
                    onChange={(e) => updateBand(band, 0, e.target.value)}
                    className="w-full rounded-sm border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-rust"
                  />
                  <span className="text-ink/30">–</span>
                  <input
                    type="number"
                    placeholder="∞"
                    value={binding.value_bands[band][1] ?? ''}
                    onChange={(e) => updateBand(band, 1, e.target.value)}
                    className="w-full rounded-sm border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-rust"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-rust-dark">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 cursor-pointer self-start rounded-sm bg-ink px-6 py-3 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust disabled:opacity-50"
        >
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE CHANGES'}
        </button>
      </form>
    </div>
  )
}
