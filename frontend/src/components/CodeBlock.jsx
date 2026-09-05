import { useState } from 'react'

export default function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, done)
    else done()
  }

  return (
    <div className="overflow-hidden rounded bg-panel">
      <div className="flex items-center justify-between border-b border-cream/10 px-4 py-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-cream/40">{label || 'SHELL'}</span>
        <button
          onClick={copy}
          className="cursor-pointer rounded-sm border-none bg-transparent font-mono text-[10px] font-semibold tracking-[0.14em] text-cream/60 hover:text-cream"
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-[clamp(16px,2.2vw,24px)] font-mono text-[12.5px] leading-[1.7] text-cream">
        {code}
      </pre>
    </div>
  )
}
