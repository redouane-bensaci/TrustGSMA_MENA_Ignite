import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'

const STAGES = [
  {
    n: '01',
    title: 'Business Binding',
    tag: 'Context, set once',
    text: "Before any transaction arrives, a business declares its shape: sector, transaction types, value bands (routine / elevated / critical), risk appetite, and the threats it actually worries about. This is the context the agent reasons against — it isn't guessed at decision time.",
    detail: '{ sector, value_bands, risk_appetite, declared_threats, friction_policy }',
  },
  {
    n: '02',
    title: 'Reasoning Loop',
    tag: 'Observe → Decide → Call → Re-evaluate',
    text: 'A transaction event arrives with nothing more than amount, counterparty, and channel. The agent fetches the business binding and the counterparty\'s history itself — never trusts either from the caller — then reasons in a bounded loop: which signal is worth its cost right now, given what we already know?',
    detail: 'budget-checked on every iteration — a cheap signal always fires before an expensive one',
  },
  {
    n: '03',
    title: 'Tool Registry',
    tag: 'Seven CAMARA network calls, closed set',
    text: 'The agent can only call from a fixed registry of seven network-standard tools — number verification, device status, SIM swap recency, location match, location retrieval, KYC match, number recycling. Nothing outside this list exists to it. Closed by design, so nothing improvised sneaks into a fraud decision.',
    detail: '→ /docs/tools',
    href: '/docs/tools',
  },
  {
    n: '04',
    title: 'Verdict',
    tag: 'Deterministic floor, always',
    text: 'Once the loop stops, a synthesis step applies fixed weights and three deterministic override rules on top of whatever the model argued for. A verdict lands as APPROVE, REVIEW, HOLD, or REJECT — with every signal, its weight, and any override rule attached, never a black box.',
    detail: 'the override rules cap a score regardless of what the agent wanted',
  },
]

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="HOW IT WORKS"
        title="The agent, explained end to end."
        description="Four stages, in order, every single time. Nothing here is improvised at decision time — the shape of the reasoning is fixed; only which signals get bought changes."
      />

      <section className="border-t border-ink/14 py-[clamp(46px,6vw,80px)]">
        <div className="flex flex-col gap-0">
          {STAGES.map((s, i) => (
            <Reveal key={s.n} className="relative">
              <div className="flex flex-wrap gap-[clamp(16px,3vw,40px)] border-l-2 border-ink/16 py-[clamp(24px,3vw,36px)] pl-[clamp(16px,2.5vw,30px)]">
                <div className="flex-none pt-1.5 font-mono text-[11px] tracking-[0.2em] text-rust" style={{ flexBasis: 62 }}>
                  {s.n}
                </div>
                <div className="min-w-[260px] flex-1">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-ink/45">{s.tag}</div>
                  <h2 className="mt-1.5 font-display text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.02em]">
                    {s.title}
                  </h2>
                  <p className="mt-2.5 max-w-[62ch] text-wrap-pretty text-[15.5px] leading-[1.6] text-ink/68">
                    {s.text}
                  </p>
                  {s.href ? (
                    <Link
                      to={s.href}
                      className="mt-3 inline-block font-mono text-xs tracking-[0.1em] text-rust hover:text-rust-dark"
                    >
                      {s.detail}
                    </Link>
                  ) : (
                    <div className="mt-3 inline-block rounded-sm bg-panel px-3 py-2 font-mono text-[11.5px] text-cream/70">
                      {s.detail}
                    </div>
                  )}
                </div>
              </div>
              {i < STAGES.length - 1 ? (
                <div className="flex pl-[7px]">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: 28 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="w-px bg-ink/20"
                  />
                </div>
              ) : null}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-ink/14 py-[clamp(46px,6vw,80px)] pb-[clamp(70px,10vw,120px)]">
        <h2 className="m-0 max-w-[24ch] font-display text-[clamp(24px,2.8vw,38px)] font-extrabold tracking-[-0.025em]">
          See it reason on a live transaction.
        </h2>
        <p className="mt-3 max-w-[54ch] text-wrap-pretty text-base leading-relaxed text-ink/62">
          The playground runs this exact loop against a real transaction you shape — no signup needed.
        </p>
        <Link
          to="/playground"
          className="mt-6 inline-block rounded-sm border border-ink bg-transparent px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.12em] text-ink no-underline transition-colors hover:bg-ink hover:text-paper"
        >
          OPEN THE PLAYGROUND
        </Link>
      </section>
    </>
  )
}
