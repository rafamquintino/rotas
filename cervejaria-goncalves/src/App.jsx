import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Loader from './components/Loader'
import Header from './components/Header'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'
import Lineup from './components/Lineup'
import Packs from './components/Packs'
import Business from './components/Business'
import Footer from './components/Footer'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [entered, setEntered] = useState(false)
  const lenisRef = useRef(null)

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({ lerp: reduced ? 1 : 0.12, smoothWheel: !reduced, wheelMultiplier: 1.1 })
    lenisRef.current = lenis
    lenis.stop()
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  const onEnter = useCallback(() => {
    setEntered(true)
    document.documentElement.classList.remove('is-loading')
    lenisRef.current?.start()
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [])

  const goTo = useCallback((target) => {
    lenisRef.current?.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  }, [])

  return (
    <>
      <Header goTo={goTo} />
      <main>
        <Hero />
        <Manifesto />
        <Lineup />
        <Packs />
        <Business />
      </main>
      <Footer />
      <div className="grain" aria-hidden="true" />
      {!entered && <Loader onEnter={onEnter} />}
    </>
  )
}
