import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CASES } from '../lib/trace'
import { useTracePlayer } from '../hooks/useTracePlayer'
import TraceLines from '../components/TraceLines'
import VerdictStamp from '../components/VerdictStamp'
import WaveSection from '../components/WaveSection'

function CaseCard({ cs, isOpen, featured, onToggle }) {
  const { lines, units, play } = useTracePlayer(1)
  const [verdict, setVerdict] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setVerdict(null)
    play(cs.steps).then(() => {
      if (!cancelled) setVerdict(cs.verdict)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const tagColor =
    cs.tag === 'ESCALATION' ? '#b23a2a' : cs.tag === 'ROUTINE' ? 'rgba(28,26,20,0.45)' : '#8a6a1a'

  return (
    <div
      className="overflow-hidden rounded border"
      style={{
        borderColor: isOpen ? '#1c1a14' : 'rgba(28,26,20,0.2)',
        background: isOpen ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)',
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-[clamp(12px,2vw,22px)] border-none bg-transparent p-[clamp(16px,2vw,22px)] text-left transition-colors hover:bg-ink/[0.035]"
      >
        <span
          className="flex-none font-mono text-[11px] tracking-[0.2em]"
          style={{ color: featured ? '#b23a2a' : 'rgba(28,26,20,0.42)' }}
        >
          {cs.id}
        </span>
        <span className="min-w-[240px] flex-1 font-display text-[clamp(17px,1.9vw,25px)] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
          {cs.title}
        </span>
        <span
          className="flex-none rounded-sm border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em]"
          style={{ borderColor: tagColor, color: tagColor }}
        >
          {cs.tag}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink/85 bg-panel p-[clamp(16px,2vw,22px)]">
              <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
                <span className="min-w-[200px] flex-1 font-mono text-[11px] break-words text-cream/45">
                  {cs.subject}
                </span>
                <span className="font-mono text-[11px] tracking-[0.14em] text-cream/45">
                  {String(units).padStart(2, '0')} UNITS
                </span>
              </div>
              <TraceLines lines={lines} />
              {verdict ? (
                <div className="mt-[18px] border-t border-cream/14 pt-4">
                  <VerdictStamp verdict={verdict} note={cs.note} />
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default function CaseFiles({ onSectionEnter, featuredCase = 'B' }) {
  const [openId, setOpenId] = useState(`CASE ${featuredCase}`)

  return (
    <WaveSection
      label="Case files"
      mode="alert"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]"
    >
      <div className="mb-[clamp(24px,3vw,40px)] flex flex-wrap items-end justify-between gap-5">
        <h2 className="m-0 font-display text-[clamp(28px,3.4vw,46px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
          Case files.
        </h2>
        <div className="font-mono text-[11px] text-ink/45">open one — it plays out as it happened</div>
      </div>

      <div className="flex flex-col gap-3">
        {CASES.map((cs) => (
          <CaseCard
            key={cs.id}
            cs={cs}
            isOpen={openId === cs.id}
            featured={`CASE ${featuredCase}` === cs.id}
            onToggle={() => setOpenId((cur) => (cur === cs.id ? null : cs.id))}
          />
        ))}
      </div>

      <p className="mt-[clamp(26px,3vw,40px)] max-w-[34ch] text-wrap-pretty font-display text-[clamp(19px,2.1vw,28px)] leading-[1.25] font-semibold tracking-[-0.02em]">
        No single signal here would have caught it. <span className="text-rust">That's the point.</span>
      </p>
    </WaveSection>
  )
}
