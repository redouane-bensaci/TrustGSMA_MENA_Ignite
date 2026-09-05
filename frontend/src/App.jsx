import { useCallback, useState } from 'react'
import WaveCanvas from './components/WaveCanvas'
import Header from './components/Header'
import Footer from './components/Footer'
import Hero from './sections/Hero'
import StatSection from './sections/StatSection'
import HowItDecides from './sections/HowItDecides'
import CaseFiles from './sections/CaseFiles'
import ThreeDoors from './sections/ThreeDoors'
import Limits from './sections/Limits'
import Developers from './sections/Developers'
import Closing from './sections/Closing'

export default function App() {
  const [waveMode, setWaveMode] = useState('calm')
  const onSectionEnter = useCallback((mode) => setWaveMode(mode), [])

  return (
    <div className="bg-grid relative min-h-screen overflow-x-hidden font-sans text-ink">
      <WaveCanvas mode={waveMode} />
      <div
        className="mx-auto box-border max-w-[1240px]"
        style={{ padding: '0 clamp(20px, 4vw, 48px) 0 clamp(20px, calc(9vw - 18px), 96px)' }}
      >
        <Header onSectionEnter={onSectionEnter} />
        <Hero onSectionEnter={onSectionEnter} />
        <StatSection onSectionEnter={onSectionEnter} />
        <HowItDecides onSectionEnter={onSectionEnter} />
        <CaseFiles onSectionEnter={onSectionEnter} featuredCase="B" />
        <ThreeDoors onSectionEnter={onSectionEnter} />
        <Limits onSectionEnter={onSectionEnter} />
        <Developers onSectionEnter={onSectionEnter} />
        <Closing onSectionEnter={onSectionEnter} />
        <Footer />
      </div>
    </div>
  )
}
