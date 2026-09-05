import Reveal from '../components/Reveal'
import WaveSection from '../components/WaveSection'

const STEPS = [
  {
    n: '01',
    title: 'Binding',
    text: 'Before anything else: is this device still the device the number lives on? A SIM that moved 14 hours ago is not the same identity, no matter what the password says.',
  },
  {
    n: '02',
    title: 'Registry',
    text: "The other end of the transfer has a history it didn't choose: age, cluster, how many strangers paid it this week. You can rename an account. You can't rename its graph.",
  },
  {
    n: '03',
    title: 'Budget',
    text: 'Every call costs units, and the agent knows what the transaction is worth. Cheap questions first. Expensive ones only when the cheap answers disagree.',
  },
  {
    n: '04',
    title: 'The loop',
    text: 'Think, call, observe, think again. Not a pipeline — a loop that can change its mind halfway through and buy one more signal.',
  },
  {
    n: '05',
    title: 'Verdict',
    text: "Approve, review, hold — with the trace attached. If you can't read why it decided, it didn't decide, it guessed.",
    accent: true,
  },
]

export default function HowItDecides({ onSectionEnter }) {
  return (
    <WaveSection
      label="How it decides"
      mode="calm"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 pt-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,130px)]"
    >
      <h2 className="m-0 mb-[clamp(30px,4vw,54px)] font-display text-[clamp(28px,3.4vw,46px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
        How it decides.
      </h2>
      <div className="flex flex-col gap-[clamp(28px,4vw,52px)]">
        {STEPS.map((s) => (
          <Reveal
            key={s.n}
            className={`flex flex-wrap gap-[clamp(16px,3vw,40px)] border-l-2 pl-[clamp(16px,2.5vw,30px)] ${
              s.accent ? 'border-rust' : 'border-ink/16'
            }`}
          >
            <div className="flex-none pt-1.5 font-mono text-[11px] tracking-[0.2em] text-rust" style={{ flexBasis: 62 }}>
              {s.n}
            </div>
            <div className="min-w-[260px] flex-1">
              <h3 className="m-0 font-display text-[clamp(21px,2.3vw,31px)] font-semibold tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="mt-2 max-w-[46ch] text-wrap-pretty text-base leading-[1.55] text-ink/66">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </WaveSection>
  )
}
