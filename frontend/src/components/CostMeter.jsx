import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const MAX_TICKS = 12

export default function CostMeter({ units, budget }) {
  const needleRef = useRef(null)
  const tickRefs = useRef([])

  const pct = (Math.min(units, MAX_TICKS) / MAX_TICKS) * 100

  useEffect(() => {
    if (!needleRef.current) return
    gsap.to(needleRef.current, {
      left: `${pct}%`,
      duration: 0.22,
      ease: 'power2.out',
    })
  }, [pct])

  useEffect(() => {
    tickRefs.current.forEach((el, i) => {
      if (!el) return
      const on = i < units
      const overBudget = i >= budget
      const bg = on ? (overBudget ? '#e8877a' : i >= budget - 2 ? '#d8b25a' : '#8fbf9f') : 'rgba(232,228,216,0.13)'
      const h = on ? 10 + (i % 3) * 5 + 8 : 10
      gsap.to(el, { height: h, backgroundColor: bg, duration: 0.28, ease: 'power2.out' })
    })
  }, [units, budget])

  return (
    <div className="relative mt-3">
      <div className="flex h-[26px] items-end gap-[3px]">
        {Array.from({ length: MAX_TICKS }).map((_, i) => (
          <div
            key={i}
            ref={(el) => (tickRefs.current[i] = el)}
            className="h-[10px] flex-1 rounded-[1px]"
            style={{ background: 'rgba(232,228,216,0.13)' }}
          />
        ))}
      </div>
      <div
        ref={needleRef}
        className="absolute -top-1 h-[34px] w-0.5 bg-cream"
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}
