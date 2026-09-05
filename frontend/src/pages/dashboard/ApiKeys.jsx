import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'

function randomKey(prefix) {
  return `${prefix}_${Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`
}

export default function ApiKeys() {
  const { user } = useAuth()
  const [liveKey, setLiveKey] = useState(() => randomKey('trust_live'))
  const [testKey, setTestKey] = useState(() => randomKey('trust_test'))
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(null)

  const copy = (key, label) => {
    navigator.clipboard?.writeText(key).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const KeyRow = ({ label, value, onRegenerate }) => (
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
            onClick={onRegenerate}
            className="cursor-pointer rounded-sm border border-rust/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-rust hover:bg-rust/10"
          >
            REGENERATE
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
        Tenant <code className="text-ink/75">{user?.tenant_id}</code>. Regenerating a key here is
        cosmetic in this hackathon build — real rotation lands post-deadline at{' '}
        <code className="text-ink/75">POST /v1/auth/keys/rotate</code>.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <KeyRow label="LIVE KEY" value={liveKey} onRegenerate={() => setLiveKey(randomKey('trust_live'))} />
        <KeyRow label="TEST KEY" value={testKey} onRegenerate={() => setTestKey(randomKey('trust_test'))} />
      </div>

      <div className="mt-8">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">WEBHOOK URL</span>
          <input
            type="url"
            placeholder="https://your-app.example.com/webhooks/trust"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="max-w-[480px] rounded-sm border border-ink/20 bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-rust"
          />
        </label>
        <p className="mt-2 max-w-[56ch] text-xs text-ink/45">
          Delivery isn't wired up yet — see{' '}
          <span className="text-ink/60">Webhooks</span> in the sidebar.
        </p>
      </div>
    </div>
  )
}
