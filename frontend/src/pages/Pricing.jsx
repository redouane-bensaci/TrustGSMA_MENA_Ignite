import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

const BANDS = [
  { units: '2', label: 'Routine', desc: 'Cheap signals agree, closed fast — most of the volume lives here.' },
  { units: '4', label: 'Elevated', desc: 'One signal is off, binding still holds — the agent buys one more check.' },
  { units: '7', label: 'Critical', desc: 'Independent signals disagree — the full loop runs before it closes.' },
]

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="PRICING"
        title="Priced in cost units, not seats."
        description="TRUST spends 2, 4, or 7 units depending on what the transaction actually deserves — plan tiers will map onto these bands. We haven't locked the numbers yet, so consider this a preview of the shape, not a quote."
      />

      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)]">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {BANDS.map((b) => (
            <div key={b.units} className="rounded border border-ink/18 bg-white/40 p-6">
              <div className="font-mono text-[28px] font-semibold text-rust">{b.units}</div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ink/45">UNITS · {b.label.toUpperCase()}</div>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]">
        <div className="rounded border border-dashed border-ink/25 bg-white/30 p-[clamp(24px,3vw,40px)]">
          <div className="font-mono text-[10px] tracking-[0.2em] text-ink/45">PLACEHOLDER</div>
          <h2 className="mt-3 font-display text-[clamp(22px,2.6vw,32px)] font-bold tracking-[-0.02em]">
            Plan tiers land after the hackathon.
          </h2>
          <p className="mt-3 max-w-[56ch] text-wrap-pretty text-[15px] leading-relaxed text-ink/65">
            We're keeping this page live so the shape of pricing is visible, but the actual per-unit rate,
            monthly minimums, and volume discounts are deliberately not set yet — they depend on carrier
            partnership terms we're still negotiating. Talk to us directly in the meantime.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-block rounded-sm border border-ink px-5 py-3 font-mono text-xs font-semibold tracking-[0.12em] text-ink no-underline hover:bg-ink hover:text-paper"
          >
            CONTACT SALES
          </Link>
        </div>
      </section>
    </>
  )
}
