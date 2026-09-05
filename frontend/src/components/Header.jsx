import WaveSection from './WaveSection'

export default function Header({ onSectionEnter }) {
  return (
    <WaveSection
      mode="calm"
      onEnter={onSectionEnter}
      className="flex flex-wrap items-center justify-between gap-4 pt-[26px]"
    >
      <div className="flex items-center gap-6">
        <div className="font-mono text-sm font-semibold tracking-[0.42em]">TRUST</div>
        <nav className="flex gap-4 font-mono text-[11px] tracking-[0.12em]">
          <a href="./frontend/playground/index.html" className="text-ink/70 no-underline hover:text-rust">
            PLAYGROUND
          </a>
          <a href="./frontend/dashboard/index.html" className="text-ink/70 no-underline hover:text-rust">
            DASHBOARD
          </a>
          <a href="./frontend/docs/index.html" className="text-ink/70 no-underline hover:text-rust">
            DOCS
          </a>
        </nav>
      </div>
      <div className="rounded-sm border border-ink/16 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-ink/45">
        GSMA MENA IGNITE · SEPT 2026
      </div>
    </WaveSection>
  )
}
