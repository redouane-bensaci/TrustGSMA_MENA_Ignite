import Reveal from '../components/Reveal'
import WaveSection from '../components/WaveSection'

const CLAIM = [
  'Account takeover after a SIM port-out — caught in the binding step, before money moves.',
  'Mule accounts with no history to stand on.',
  'A readable reason for every hold, every time.',
]

const NOT_YET = [
  'A victim who is genuinely on their own device, willingly sending money to a fraudster. Nothing in the network is lying there.',
  'Cash-out rings that never touch a mobile identity.',
  'Anything at all in a market where we have no carrier peering.',
]

export default function Limits({ onSectionEnter }) {
  return (
    <WaveSection
      label="Limits"
      mode="watch"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]"
    >
      <h2 className="m-0 max-w-[30ch] text-wrap-pretty font-display text-[clamp(26px,3.1vw,42px)] leading-[1.06] font-extrabold tracking-[-0.03em]">
        A system that claims everything catches nothing.
      </h2>
      <div
        className="mt-[clamp(28px,3.5vw,48px)] grid gap-[clamp(24px,4vw,56px)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        <Reveal>
          <div className="border-b border-ink/16 pb-3 font-mono text-[10px] tracking-[0.2em]" style={{ color: '#2f6d51' }}>
            WE CLAIM
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {CLAIM.map((t) => (
              <div key={t} className="text-[15.5px] leading-[1.5] text-ink/78">
                {t}
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <div className="border-b border-ink/16 pb-3 font-mono text-[10px] tracking-[0.2em] text-rust">
            WE DON'T — YET
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {NOT_YET.map((t) => (
              <div key={t} className="text-[15.5px] leading-[1.5] text-ink/78">
                {t}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </WaveSection>
  )
}
