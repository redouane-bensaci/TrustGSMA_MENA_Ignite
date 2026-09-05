import { motion } from 'framer-motion'
import WaveSection from '../components/WaveSection'

const DOORS = [
  {
    n: 'DOOR 01',
    title: 'Bank',
    text: 'Full loop, full budget, full trace in the audit file. Your reviewers stop guessing why.',
    cost: 'up to 12 units / decision',
    dark: false,
  },
  {
    n: 'DOOR 02',
    title: 'Platform',
    text: 'One call at checkout. Binding plus registry, escalation only when the numbers get interesting.',
    cost: '2–7 units / decision',
    dark: false,
  },
  {
    n: 'DOOR 03',
    title: 'SME',
    text: "A shop with a phone gets the same SIM-swap answer a bank does. That's the whole idea.",
    cost: '2 units, flat',
    dark: true,
  },
]

export default function ThreeDoors({ onSectionEnter }) {
  return (
    <WaveSection
      label="Three doors"
      mode="calm"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]"
    >
      <h2 className="m-0 max-w-[22ch] font-display text-[clamp(28px,3.4vw,46px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
        Three doors in. Same truth out.
      </h2>
      <p className="mt-3.5 mb-[clamp(28px,3.5vw,46px)] max-w-[50ch] text-wrap-pretty text-base leading-[1.55] text-ink/62">
        However small you are, the network doesn't grade on a curve. The depth of the trace changes; the signals
        don't.
      </p>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {DOORS.map((d, i) => (
          <motion.div
            key={d.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className={`rounded border p-[clamp(20px,2.4vw,30px)] ${
              d.dark ? 'border-ink bg-panel' : 'border-ink/18 bg-white/40'
            }`}
          >
            <div
              className="font-mono text-[10px] tracking-[0.2em]"
              style={{ color: d.dark ? 'rgba(232,228,216,0.45)' : 'rgba(28,26,20,0.42)' }}
            >
              {d.n}
            </div>
            <h3
              className="mt-3 font-display text-[26px] font-semibold tracking-[-0.02em]"
              style={{ color: d.dark ? '#e8e4d8' : undefined }}
            >
              {d.title}
            </h3>
            <p
              className="mt-2 mb-4 text-wrap-pretty text-[15px] leading-[1.55]"
              style={{ color: d.dark ? 'rgba(232,228,216,0.6)' : 'rgba(28,26,20,0.65)' }}
            >
              {d.text}
            </p>
            <div
              className="border-t pt-3 font-mono text-[11.5px]"
              style={{
                borderColor: d.dark ? 'rgba(232,228,216,0.16)' : 'rgba(28,26,20,0.14)',
                color: d.dark ? '#e8877a' : '#1c1a14',
              }}
            >
              {d.cost}
            </div>
          </motion.div>
        ))}
      </div>
    </WaveSection>
  )
}
