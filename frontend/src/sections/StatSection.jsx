import { useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import WaveSection from '../components/WaveSection'

export default function StatSection({ onSectionEnter }) {
  const numRefs = useRef([])
  const [played, setPlayed] = useState(false)

  const handleEnter = (mode) => {
    onSectionEnter?.(mode)
    if (!played) {
      setPlayed(true)
      animate(numRefs.current.filter(Boolean), {
        scale: [1.35, 1],
        opacity: [0, 1],
        delay: stagger(160),
        duration: 620,
        ease: 'outElastic(1, .6)',
      })
    }
  }

  return (
    <WaveSection
      label="Stat"
      mode="watch"
      onEnter={handleEnter}
      className="py-[clamp(72px,11vw,150px)] pb-[clamp(60px,9vw,120px)]"
    >
      <div className="mb-[26px] font-mono text-[10px] tracking-[0.24em] text-ink/42">
        THE ASYMMETRY EVERY CHECKLIST IGNORES
      </div>
      <p className="m-0 max-w-[26ch] text-wrap-pretty font-display text-[clamp(26px,3.9vw,56px)] leading-[1.1] font-semibold tracking-[-0.025em]">
        A fixed rule set costs the same to guard{' '}
        <span
          ref={(el) => (numRefs.current[0] = el)}
          className="inline-block font-mono text-[0.82em] font-medium"
        >
          2,000 DZD
        </span>{' '}
        and{' '}
        <span
          ref={(el) => (numRefs.current[1] = el)}
          className="inline-block font-mono text-[0.82em] font-medium"
        >
          200,000 DZD
        </span>
        .
      </p>
      <p className="mt-[18px] max-w-[26ch] text-wrap-pretty font-display text-[clamp(26px,3.9vw,56px)] leading-[1.1] font-extrabold tracking-[-0.025em] text-rust">
        TRUST spends 2 units on one and 7 on the other.
      </p>
    </WaveSection>
  )
}
