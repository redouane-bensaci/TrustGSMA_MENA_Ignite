export default function TraceLines({ lines, idle, idleText }) {
  if (!lines.length) {
    return idle ? (
      <div className="font-mono text-[12.5px] leading-relaxed text-cream/32">{idleText}</div>
    ) : null
  }
  return (
    <>
      {lines.map((ln, i) => (
        <div key={i} className="flex items-start gap-2.5 py-[3px]">
          <span
            className="flex-none rounded-sm px-0 py-[3px] text-center font-mono text-[9.5px] font-semibold tracking-[0.14em]"
            style={{ background: ln.bg, color: ln.fg, width: 66 }}
          >
            {ln.kind}
          </span>
          <span className="font-mono text-[12.5px] leading-relaxed break-words" style={{ color: ln.color }}>
            {ln.text}
            {ln.caret ? <span className="caret" /> : null}
          </span>
        </div>
      ))}
    </>
  )
}
