import { Link } from 'react-router-dom'
import { VERIFY_CURL } from '../lib/apiExamples'
import CodeBlock from '../components/CodeBlock'
import WaveSection from '../components/WaveSection'

export default function Developers({ onSectionEnter }) {
  return (
    <WaveSection
      label="Developers"
      mode="calm"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]"
    >
      <div className="mb-[clamp(20px,2.5vw,32px)] flex flex-wrap items-end justify-between gap-4.5">
        <h2 className="m-0 font-display text-[clamp(26px,3.1vw,42px)] font-extrabold tracking-[-0.03em]">
          One endpoint. One verdict.
        </h2>
        <Link
          to="/docs/quickstart"
          className="rounded-sm border border-ink bg-transparent px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-ink no-underline transition-colors hover:bg-ink hover:text-paper"
        >
          READ THE DOCS
        </Link>
      </div>
      <div className="shadow-[14px_14px_0_rgba(28,26,20,0.1)]">
        <CodeBlock code={VERIFY_CURL} label="POST /v1/verify" />
      </div>
      <div className="mt-3.5 font-mono text-xs text-ink/50">
        → 200 OK · {'{ "verdict": { "decision": "hold", "cost_units_spent": 5, "signals": [ … ] } }'}
      </div>
    </WaveSection>
  )
}
