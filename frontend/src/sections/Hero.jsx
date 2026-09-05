import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { buildPlan, fmt, VC } from '../lib/trace'
import { useTracePlayer } from '../hooks/useTracePlayer'
import TraceLines from '../components/TraceLines'
import VerdictStamp from '../components/VerdictStamp'
import CostMeter from '../components/CostMeter'

const HEADLINE = "Everyone can be faked. The network can't."

export default function Hero({ onSectionEnter }) {
  const [amount, setAmount] = useState(2400)
  const [newCp, setNewCp] = useState(false)
  const [geoMatch, setGeoMatch] = useState(true)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [note, setNote] = useState('')
  const [budget, setBudget] = useState(3)

  const { lines, units, play } = useTracePlayer(1)
  const sectionRef = useRef(null)

  const plan = buildPlan(amount, newCp, geoMatch)
  const displayBudget = started ? budget : plan.budget

  const runSim = async () => {
    const p = buildPlan(amount, newCp, geoMatch)
    setVerdict(null)
    setNote('')
    setRunning(true)
    setStarted(true)
    setBudget(p.budget)
    onSectionEnter?.(p.risk >= 5 ? 'alert' : p.risk >= 2 ? 'watch' : 'calm')
    await play(p.steps)
    setVerdict(p.verdict)
    setNote(p.note)
    setRunning(false)
  }

  useEffect(() => {
    const t = setTimeout(() => runSim(), 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sectionRef.current || !window.IntersectionObserver) return
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting && !running) onSectionEnter?.('calm')
        })
      },
      { threshold: [0.2, 0.5, 0.8] },
    )
    io.observe(sectionRef.current)
    return () => io.disconnect()
  }, [running, onSectionEnter])

  const makeSuspicious = () => {
    setAmount(184000)
    setNewCp(true)
    setGeoMatch(false)
    setTimeout(() => runSim(), 0)
  }

  const cpActive = newCp
  const geoActive = !geoMatch
  const toggleClass = (active) =>
    `flex w-full items-center justify-between gap-2.5 rounded-sm border px-3 py-2.5 text-left font-mono text-xs transition-colors hover:border-cream/50 ${
      active ? 'border-rust bg-rust/16 text-rust-soft' : 'border-cream/20 bg-transparent text-cream/60'
    }`

  return (
    <section ref={sectionRef} data-screen-label="Hero" className="pt-[clamp(38px,7vw,88px)]">
      <h1 className="max-w-[15ch] text-wrap-balance font-display text-[clamp(40px,7.4vw,106px)] leading-[0.94] font-extrabold tracking-[-0.035em] m-0">
        {HEADLINE}
      </h1>
      <p className="mt-[22px] max-w-[54ch] text-wrap-pretty text-[clamp(16px,1.5vw,20px)] leading-relaxed text-ink/66">
        TRUST asks the network the person is standing on — the SIM, the device binding, the port-out log — then
        spends only as much of its budget as the risk actually deserves.
      </p>

      <div className="mt-[clamp(30px,4vw,46px)] overflow-hidden rounded border border-ink/90 bg-panel shadow-[14px_14px_0_rgba(28,26,20,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/14 px-4 py-3">
          <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.18em] text-cream/55">
            <motion.span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: running ? '#d8b25a' : verdict ? VC[verdict] : 'rgba(232,228,216,0.4)' }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span>AGENT · SANDBOX · {running ? 'REASONING' : verdict ? 'CLOSED' : 'IDLE'}</span>
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.18em] text-cream/30">v1/verify</div>
        </div>

        <div className="flex flex-wrap items-stretch">
          <div className="box-border min-w-[260px] flex-[1_1_290px] border-r border-cream/14 p-5">
            <div className="font-mono text-[10px] tracking-[0.2em] text-cream/40">TRANSACTION</div>

            <div className="mt-[18px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-cream/50">amount</span>
                <span className="font-mono text-[17px] font-semibold text-cream">
                  {fmt(amount)} <span className="text-[11px] text-cream/45">DZD</span>
                </span>
              </div>
              <input
                type="range"
                min={800}
                max={240000}
                step={200}
                value={amount}
                onChange={(e) => {
                  setAmount(parseInt(e.target.value, 10))
                  setRunning(false)
                }}
                className="mt-3.5 h-[15px] w-full"
              />
            </div>

            <div className="mt-[22px] flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setNewCp((v) => !v)
                  setRunning(false)
                }}
                className={toggleClass(cpActive)}
              >
                <span>counterparty.is_new</span>
                <span className="font-semibold">{newCp ? 'true' : 'false'}</span>
              </button>
              <button
                onClick={() => {
                  setGeoMatch((v) => !v)
                  setRunning(false)
                }}
                className={toggleClass(geoActive)}
              >
                <span>session.geo_match</span>
                <span className="font-semibold">{geoMatch ? 'true' : 'false'}</span>
              </button>
            </div>

            <div className="mt-[22px] flex flex-wrap gap-2">
              <button
                onClick={runSim}
                className="flex-[1_1_110px] cursor-pointer rounded-sm border-none bg-cream px-3.5 py-3.5 font-mono text-xs font-semibold tracking-[0.14em] text-panel transition-colors hover:bg-white"
              >
                {running ? 'RUNNING…' : 'RUN'}
              </button>
              <button
                onClick={makeSuspicious}
                className="flex-[1_1_130px] cursor-pointer rounded-sm border border-rust bg-rust/14 px-3.5 py-3.5 font-mono text-xs font-semibold tracking-[0.14em] text-rust-soft transition-colors hover:bg-rust/30 hover:text-white"
              >
                MAKE IT SUSPICIOUS
              </button>
            </div>

            <p className="mt-4 text-wrap-pretty font-sans text-xs leading-relaxed text-cream/35">
              Scripted sandbox trace. Same decision path, same budget maths, no live carrier calls.
            </p>
          </div>

          <div className="flex min-w-[300px] flex-[1_1_400px] flex-col">
            <div className="border-b border-cream/14 px-5 pt-4 pb-3.5">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-mono text-[10px] tracking-[0.2em] text-cream/40">COST METER</span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-cream/40">
                  BUDGET {String(displayBudget).padStart(2, '0')}
                </span>
              </div>
              <CostMeter units={units} budget={displayBudget} />
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-mono text-[26px] leading-none font-semibold text-cream">
                  {String(units).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.16em] text-cream/40">UNITS SPENT</span>
              </div>
            </div>

            <div className="min-h-[268px] flex-1 px-5 py-4">
              <TraceLines
                lines={lines}
                idle={!started}
                idleText="// awaiting transaction. drag the amount, flip a flag, hit run."
              />
            </div>

            <div className="border-t border-cream/14 px-5 py-[18px]">
              <VerdictStamp verdict={verdict} note={note} size="lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
