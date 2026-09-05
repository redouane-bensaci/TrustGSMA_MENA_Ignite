import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const EVENT_OPTIONS = ['verdict.created']

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState(null)
  const [error, setError] = useState(null)
  const [url, setUrl] = useState('')
  const [registering, setRegistering] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deliveries, setDeliveries] = useState(null)

  const load = () => api.listWebhooks().then(setWebhooks).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const register = async (e) => {
    e.preventDefault()
    setRegistering(true)
    setError(null)
    try {
      await api.registerWebhook(url, EVENT_OPTIONS)
      setUrl('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRegistering(false)
    }
  }

  const openDeliveries = async (webhook) => {
    setSelected(webhook)
    setDeliveries(null)
    try {
      const logs = await api.listDeliveries(webhook.id)
      setDeliveries(logs)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · WEBHOOKS</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Delivery endpoints.
      </h1>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink/60">
        Every verdict fires <code className="text-ink/75">verdict.created</code> to each endpoint
        below, in the background, right after <code className="text-ink/75">POST /v1/verify</code>{' '}
        responds. A failed delivery is logged, not retried, in this build.
      </p>

      {error ? (
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">{error}</p>
      ) : null}

      <form onSubmit={register} className="mt-6 flex flex-wrap gap-2">
        <input
          required
          type="url"
          placeholder="https://your-app.example.com/webhooks/trust"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-[280px] flex-1 rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
        />
        <button
          type="submit"
          disabled={registering}
          className="cursor-pointer rounded-sm bg-ink px-5 py-2.5 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust disabled:opacity-50"
        >
          {registering ? 'REGISTERING…' : 'REGISTER'}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {(webhooks || []).map((w) => (
          <button
            key={w.id}
            onClick={() => openDeliveries(w)}
            className={`flex w-full flex-wrap items-center gap-3 rounded border px-4 py-3 text-left transition-colors ${
              selected?.id === w.id ? 'border-ink bg-white/60' : 'border-ink/14 bg-white/30 hover:border-ink/40'
            }`}
          >
            <span className="font-mono text-[12.5px] text-ink">{w.url}</span>
            <span className="ml-auto font-mono text-[10.5px] text-ink/40">{w.events.join(', ')}</span>
          </button>
        ))}
        {webhooks && webhooks.length === 0 ? (
          <div className="rounded border border-dashed border-ink/20 p-6 text-center font-mono text-xs text-ink/40">
            // no webhooks registered yet
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">
            Deliveries — <span className="font-mono text-sm text-ink/50">{selected.url}</span>
          </h2>
          <div className="mt-3 flex flex-col gap-1.5">
            {deliveries === null ? (
              <div className="h-16 animate-pulse rounded bg-ink/5" />
            ) : deliveries.length === 0 ? (
              <div className="rounded border border-dashed border-ink/20 p-5 text-center font-mono text-xs text-ink/40">
                // no deliveries yet — run a verification against this tenant
              </div>
            ) : (
              deliveries.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded border border-ink/12 bg-white/30 px-4 py-2.5">
                  <span
                    className={`rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.06em] ${
                      d.status === 'delivered' ? 'bg-green-soft/20 text-green-soft' : 'bg-rust/15 text-rust'
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink/70">{d.payload_summary}</span>
                  {d.response_code ? (
                    <span className="font-mono text-[10.5px] text-ink/40">HTTP {d.response_code}</span>
                  ) : null}
                  <span className="ml-auto font-mono text-[10.5px] text-ink/35">
                    {new Date(d.attempted_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
