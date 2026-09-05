export default function PageHero({ eyebrow, title, description, children }) {
  return (
    <section className="pt-[clamp(38px,6vw,72px)] pb-[clamp(30px,4vw,48px)]">
      {eyebrow ? (
        <div className="mb-4 font-mono text-[10px] tracking-[0.24em] text-ink/42">{eyebrow}</div>
      ) : null}
      <h1 className="m-0 max-w-[22ch] text-wrap-balance font-display text-[clamp(32px,5vw,64px)] leading-[1] font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-[60ch] text-wrap-pretty text-[clamp(15px,1.3vw,18px)] leading-relaxed text-ink/66">
          {description}
        </p>
      ) : null}
      {children}
    </section>
  )
}
