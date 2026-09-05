import { useOutletContext } from 'react-router-dom'
import Hero from '../sections/Hero'
import StatSection from '../sections/StatSection'
import HowItDecides from '../sections/HowItDecides'
import CaseFiles from '../sections/CaseFiles'
import ThreeDoors from '../sections/ThreeDoors'
import Limits from '../sections/Limits'
import Developers from '../sections/Developers'
import Closing from '../sections/Closing'

export default function Home() {
  const { onSectionEnter } = useOutletContext()

  return (
    <>
      <Hero onSectionEnter={onSectionEnter} />
      <StatSection onSectionEnter={onSectionEnter} />
      <HowItDecides onSectionEnter={onSectionEnter} />
      <CaseFiles onSectionEnter={onSectionEnter} featuredCase="B" />
      <ThreeDoors onSectionEnter={onSectionEnter} />
      <Limits onSectionEnter={onSectionEnter} />
      <Developers onSectionEnter={onSectionEnter} />
      <Closing onSectionEnter={onSectionEnter} />
    </>
  )
}
