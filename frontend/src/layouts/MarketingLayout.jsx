import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import WaveCanvas from '../components/WaveCanvas'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function MarketingLayout() {
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
        <Outlet context={{ onSectionEnter }} />
        <Footer />
      </div>
    </div>
  )
}
