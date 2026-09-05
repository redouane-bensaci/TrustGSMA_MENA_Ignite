export default function LaterStub({ eyebrow, title, description, plannedRoutes }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">{eyebrow}</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">{title}</h1>
      <div className="mt-6 rounded border border-dashed border-ink/25 bg-white/30 p-[clamp(24px,3vw,36px)]">
        <div className="font-mono text-[10px] tracking-[0.2em] text-ink/40">LATER · OUT OF SCOPE FOR THE HACKATHON</div>
        <p className="mt-3 max-w-[56ch] text-wrap-pretty text-[15px] leading-relaxed text-ink/65">{description}</p>
        {plannedRoutes?.length ? (
          <div className="mt-4 flex flex-col gap-1.5">
            {plannedRoutes.map((r) => (
              <div key={r} className="font-mono text-[12px] text-ink/45">
                {r}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
