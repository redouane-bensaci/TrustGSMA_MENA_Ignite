import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function ToolsRegistry() {
  const [tools, setTools] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .listTools()
      .then(setTools)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">DOCS / TOOL REGISTRY</div>
      <h1 className="m-0 font-display text-[clamp(26px,3.6vw,40px)] font-extrabold tracking-[-0.03em]">
        The seven signals TRUST is allowed to buy.
      </h1>
      <p className="mt-3 max-w-[62ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
        The agent's tool registry is closed by design — it can only call from this fixed set of
        CAMARA-standard network APIs. Cost weights and internal scoring are intentionally not shown
        here; this page answers "what does each tool prove," nothing more.
      </p>

      {error ? (
        <p className="mt-6 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
          Couldn't reach the API ({error}). Is the backend running on port 8000?
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        {(tools || Array.from({ length: 7 })).map((t, i) => (
          <div key={t?.id || i} className="rounded border border-ink/16 bg-white/40 p-5">
            {t ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{t.name}</h2>
                  <span className="font-mono text-[10.5px] tracking-[0.08em] text-ink/40">{t.camara_standard}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{t.description}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  <span className="font-semibold text-rust">Proves: </span>
                  {t.what_it_proves}
                </p>
              </>
            ) : (
              <div className="h-16 animate-pulse rounded bg-ink/5" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
