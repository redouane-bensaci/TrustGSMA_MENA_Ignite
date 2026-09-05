import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'

export default function ApiKeys() {
  const { user } = useAuth()
  const [keys, setKeys] = useState(null)
  const [error, setError] = useState(null)
  const [rotating, setRotating] = useState(null)
  const [copied, setCopied] = useState(null)

  const load = () => api.getKeys().then(setKeys).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const copy = (key, label) => {
    navigator.clipboard?.writeText(key).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const rotate = async (keyType) => {
    setRotating(keyType)
    setError(null)
    try {
      const updated = await api.rotateKey(keyType)
      setKeys(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setRotating(null)
    }
  }

  const KeyRow = ({ label, keyType, value }) => (
    <div className="rounded border border-ink/14 bg-white/40 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink/45">{label}</span>
        <div className="flex gap-2">
          <button
            onClick={() => copy(value, label)}
            className="cursor-pointer rounded-sm border border-ink/20 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-ink/60 hover:border-ink"
          >
            {copied === label ? 'COPIED' : 'COPY'}
          </button>
          <button
            onClick={() => rotate(keyType)}
            disabled={rotating === keyType}
            className="cursor-pointer rounded-sm border border-rust/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-rust hover:bg-rust/10 disabled:opacity-50"
          >
            {rotating === keyType ? 'ROTATING…' : 'REGENERATE'}
          </button>
        </div>
      </div>
      <div className="mt-2 truncate rounded-sm bg-ink/5 px-3 py-2 font-mono text-[12.5px] text-ink/75">{value}</div>
    </div>
  )

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · API KEYS</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Integration keys.
      </h1>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink/60">
        Tenant <code className="text-ink/75">{user?.tenant_id}</code>. Regenerating a key calls{' '}
        <code className="text-ink/75">POST /v1/auth/keys/rotate</code> for real — the old key stops
        validating immediately, there's no overlap window in this build.
      </p>

      {error ? (
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">{error}</p>
      ) : null}

      {keys ? (
        <div className="mt-6 flex flex-col gap-3">
          <KeyRow label="LIVE KEY" keyType="live" value={keys.live_key} />
          <KeyRow label="TEST KEY" keyType="test" value={keys.test_key} />
        </div>
      ) : !error ? (
        <div className="mt-6 h-32 animate-pulse rounded bg-ink/5" />
      ) : null}

      <div className="mt-8">
        <p className="max-w-[56ch] text-xs text-ink/45">
          Delivery endpoints for webhooks are managed separately — see{' '}
          <Link to="/dashboard/webhooks" className="text-rust hover:text-rust-dark">
            Webhooks
          </Link>{' '}
          in the sidebar.
        </p>
      </div>
    </div>
  )
}
