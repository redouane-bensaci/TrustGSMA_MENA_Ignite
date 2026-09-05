import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import WaveSection from '../components/WaveSection'

const MotionLink = motion(Link)

export default function Closing({ onSectionEnter }) {
  return (
    <WaveSection
      label="Closing"
      mode="alert"
      onEnter={onSectionEnter}
      className="border-t border-ink/14 py-[clamp(70px,11vw,150px)] pb-[clamp(70px,10vw,130px)]"
    >
      <p className="m-0 max-w-[15ch] text-wrap-balance font-display text-[clamp(38px,7vw,96px)] leading-[0.96] font-extrabold tracking-[-0.04em]">
        Ask the network. Not the person.
      </p>
      <div className="mt-[clamp(30px,4vw,52px)] flex flex-wrap items-center gap-4.5">
        <MotionLink
          to="/playground"
          whileHover={{ backgroundColor: '#1c1a14', color: '#f4f1e9' }}
          className="rounded-sm bg-rust px-[30px] py-5 font-mono text-[clamp(13px,1.3vw,16px)] font-semibold tracking-[0.1em] text-paper shadow-[8px_8px_0_rgba(28,26,20,0.85)]"
        >
          TRY IT — GO AHEAD, TRY TO FOOL IT
        </MotionLink>
        <span className="font-mono text-xs text-ink/45">no signup · sandbox keys · 12 free units</span>
      </div>
    </WaveSection>
  )
}
