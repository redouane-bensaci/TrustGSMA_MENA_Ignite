import { useState } from 'react'
import { CURL } from '../lib/trace'
import WaveSection from '../components/WaveSection'

export default function Developers({ onSectionEnter }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(CURL).then(done, done)
    else done()
  }

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
        <button
          onClick={copy}
          className="cursor-pointer rounded-sm border border-ink bg-transparent px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <div className="overflow-x-auto rounded bg-panel p-[clamp(18px,2.4vw,28px)] shadow-[14px_14px_0_rgba(28,26,20,0.1)]">
        <pre className="m-0 font-mono text-[12.5px] leading-[1.75] text-cream">
          <span style={{ color: '#e8877a' }}>curl</span> -X POST https://api.trust.dz/
          <span style={{ color: '#d8b25a' }}>v1/verify</span> \{'\n'}
          {'  '}-H <span style={{ color: '#8fbf9f' }}>&quot;Authorization: Bearer $TRUST_KEY&quot;</span> \{'\n'}
          {'  '}-H <span style={{ color: '#8fbf9f' }}>&quot;Content-Type: application/json&quot;</span> \{'\n'}
          {'  '}-d <span style={{ color: '#8fbf9f' }}>&#39;{'{'}</span>
          {'\n    '}
          <span style={{ color: '#9fb8d8' }}>&quot;msisdn&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;+213•••••4417&quot;</span>,{'\n    '}
          <span style={{ color: '#9fb8d8' }}>&quot;amount&quot;</span>: {'{ '}
          <span style={{ color: '#9fb8d8' }}>&quot;value&quot;</span>:{' '}
          <span style={{ color: '#d8b25a' }}>184000</span>,{' '}
          <span style={{ color: '#9fb8d8' }}>&quot;currency&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;DZD&quot;</span> {'}'},{'\n    '}
          <span style={{ color: '#9fb8d8' }}>&quot;counterparty&quot;</span>: {'{ '}
          <span style={{ color: '#9fb8d8' }}>&quot;id&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;cp_9f21&quot;</span>,{' '}
          <span style={{ color: '#9fb8d8' }}>&quot;first_seen&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;6h&quot;</span> {'}'},{'\n    '}
          <span style={{ color: '#9fb8d8' }}>&quot;session&quot;</span>: {'{ '}
          <span style={{ color: '#9fb8d8' }}>&quot;cell&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;31-ORN&quot;</span>,{' '}
          <span style={{ color: '#9fb8d8' }}>&quot;ip&quot;</span>:{' '}
          <span style={{ color: '#8fbf9f' }}>&quot;41.108.•.•&quot;</span> {'}'},{'\n    '}
          <span style={{ color: '#9fb8d8' }}>&quot;budget&quot;</span>: {'{ '}
          <span style={{ color: '#9fb8d8' }}>&quot;max_units&quot;</span>:{' '}
          <span style={{ color: '#d8b25a' }}>8</span> {'}'}
          {'\n  '}
          <span style={{ color: '#8fbf9f' }}>{'}'}&#39;</span>
        </pre>
      </div>
      <div className="mt-3.5 font-mono text-xs text-ink/50">
        → 200 OK · {'{ "verdict": "hold", "units_spent": 7, "trace": [ … ] }'}
      </div>
    </WaveSection>
  )
}
