import { useState } from 'react'
import PageHero from '../components/PageHero'

export default function Contact() {
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <PageHero
        eyebrow="CONTACT"
        title="Talk to the team."
        description="Pricing, carrier partnerships, or integration questions — send a note and we'll get back to you."
      />

      <section className="border-t border-ink/14 py-[clamp(40px,5vw,64px)] pb-[clamp(70px,10vw,120px)]">
        {sent ? (
          <div className="max-w-[480px] rounded border border-ink/18 bg-white/40 p-8">
            <div className="font-mono text-[10px] tracking-[0.2em] text-green-soft">SENT</div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.02em]">Thanks — we'll be in touch.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              This is a hackathon placeholder form; no message was actually delivered anywhere.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-w-[480px] flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">NAME</span>
              <input
                required
                type="text"
                className="rounded-sm border border-ink/20 bg-white/60 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">WORK EMAIL</span>
              <input
                required
                type="email"
                className="rounded-sm border border-ink/20 bg-white/60 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/55">MESSAGE</span>
              <textarea
                required
                rows={5}
                className="resize-none rounded-sm border border-ink/20 bg-white/60 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-rust"
              />
            </label>
            <button
              type="submit"
              className="mt-2 cursor-pointer self-start rounded-sm bg-ink px-6 py-3 font-mono text-xs font-semibold tracking-[0.14em] text-paper hover:bg-rust"
            >
              SEND MESSAGE
            </button>
          </form>
        )}
      </section>
    </>
  )
}
