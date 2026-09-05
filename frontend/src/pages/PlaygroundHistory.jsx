import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { VC, fmt } from '../lib/trace'

const HISTORY_KEY = 'trust_playground_history'

export default function PlaygroundHistory() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    try {
      setEntries(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'))
    } catch {
      setEntries([])
    }
  }, [])

  return (
    <>
      <section className="pt-[clamp(38px,6vw,72px)] pb-[clamp(30px,4vw,48px)]">
        <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">PLAYGROUND / HISTORY</div>
        <h1 className="m-0 font-display text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-0.03em]">
          Past manual checks.
        </h1>
        <p className="mt-3 max-w-[56ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
          Stored locally in this browser — no account needed for the playground.{' '}
          <Link to="/playground" className="text-rust hover:text-rust-dark">
            Run another check →
          </Link>
        </p>
      </section>

      <section className="border-t border-ink/14 py-[clamp(30px,4vw,48px)] pb-[clamp(70px,10vw,120px)]">
        {entries.length === 0 ? (
          <div className="rounded border border-dashed border-ink/20 p-8 text-center font-mono text-xs text-ink/40">
            // no checks yet
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-4 rounded border border-ink/14 bg-white/40 px-5 py-3.5"
              >
                <span
                  className="rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.04em]"
                  style={{ borderColor: VC[e.decision], color: VC[e.decision] }}
                >
                  {e.decision}
                </span>
                <span className="font-mono text-[13px] text-ink">
                  {fmt(e.amount)} {e.currency}
                </span>
                <span className="font-mono text-[12px] text-ink/50">{e.msisdn}</span>
                <span className="ml-auto font-mono text-[11px] text-ink/40">
                  score {e.score} · {e.units} units
                </span>
                <span className="font-mono text-[10.5px] text-ink/35">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
