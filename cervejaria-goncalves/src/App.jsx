import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import Sections, { Header } from './components/Sections'
import { detectTier, TIER_SETTINGS } from './lib/device'
import { scroll, pointer, fx } from './lib/store'
import { BEERS } from './lib/beers'

gsap.registerPlugin(ScrollTrigger)
const Scene = lazy(() => import('./three/Scene'))
const Film = lazy(() => import('./film/Film'))

// Se existir film/manifest.json (gerado por scripts/prep-film.mjs), o site usa vídeo real.
// Sem ele, usa a cena 3D procedural.
function useStage() {
  const [stage, setStage] = useState({ kind: 'pending' })
  useEffect(() => {
    const forced = new URLSearchParams(location.search).get('stage')
    if (forced === '3d') return setStage({ kind: '3d' })
    fetch(`${import.meta.env.BASE_URL}film/manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => setStage(m?.scenes?.hero ? { kind: 'film', manifest: m } : { kind: '3d' }))
      .catch(() => setStage({ kind: '3d' }))
  }, [])
  return stage
}

export default function App() {
  const device = useMemo(detectTier, [])
  const [tier, setTier] = useState(device.tier)
  const [entered, setEntered] = useState(false)
  const lenisRef = useRef(null)
  const stage = useStage()
  const film = stage.kind === 'film'
  const noGL = tier === 'none' && !film

  useEffect(() => {
    document.documentElement.dataset.tier = film ? 'film' : tier
    document.documentElement.classList.toggle('is-film', film)
    if (noGL && stage.kind !== 'pending') fx.ready = true
  }, [tier, noGL, film, stage.kind])

  // Lenis + ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      lerp: device.reduced ? 1 : 0.085,
      smoothWheel: !device.reduced,
      syncTouch: false,
    })
    lenisRef.current = lenis
    lenis.stop()
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const triggers = []
    document.querySelectorAll('[data-phase]').forEach((el) => {
      const key = el.dataset.phase
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (s) => (scroll[key] = s.progress),
          onRefresh: (s) => (scroll[key] = s.progress),
        }),
      )
    })
    triggers.push(
      ScrollTrigger.create({
        trigger: '[data-bar]',
        start: 'top bottom',
        end: 'top 15%',
        onUpdate: (s) => (scroll.bar = s.progress),
        onRefresh: (s) => (scroll.bar = s.progress),
      }),
    )
    // textos do herói somem ao rolar
    const heroFade = gsap.to('.phase--hero [data-fade]', {
      opacity: 0,
      y: -30,
      ease: 'none',
      scrollTrigger: { trigger: '.phase--hero', start: 'top top', end: '45% top', scrub: true },
    })

    const edgeFades = []
    document.querySelectorAll('.phase--styles, .phase--process').forEach((sec) => {
      const st = sec.querySelector('.sticky')
      edgeFades.push(
        gsap.fromTo(st, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 75%', end: 'top 5%', scrub: true } }),
        gsap.fromTo(st, { '--out': 1 }, { '--out': 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'bottom 125%', end: 'bottom 95%', scrub: true } }),
      )
    })

    // cor de destaque acompanha o estilo
    let last = -1
    let light = false
    let solid = false
    const header = document.querySelector('.site-header')
    const accent = () => {
      const isFilm = document.documentElement.classList.contains('is-film')
      const onLight =
        (!isFilm && scroll.foam > 0.45 && scroll.bar < 0.3) ||
        (scroll.styles > 0.7 && scroll.styles < 1 && innerWidth < 900 && !document.documentElement.classList.contains('is-film'))
      if (onLight !== light) {
        light = onLight
        header?.classList.toggle('on-light', light)
      }
      if (scroll.bar >= 1 !== solid) {
        solid = scroll.bar >= 1
        header?.classList.toggle('is-solid', solid)
      }
      const i = Math.min(2, Math.floor(scroll.styles * 3))
      if (i !== last) {
        last = i
        document.documentElement.style.setProperty('--beer', BEERS[i].color)
      }
    }
    gsap.ticker.add(accent)

    return () => {
      gsap.ticker.remove(raf)
      gsap.ticker.remove(accent)
      triggers.forEach((t) => t.kill())
      heroFade.scrollTrigger?.kill()
      edgeFades.forEach((t) => t.scrollTrigger?.kill())
      lenis.destroy()
    }
  }, [device.reduced])

  // ponteiro / toque -> inclinação do copo; toque solta bolhas
  useEffect(() => {
    const move = (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = -((e.clientY / innerHeight) * 2 - 1)
    }
    const down = (e) => {
      if (!e.target.closest('a, button')) fx.boost = 1
    }
    const orient = (e) => {
      if (e.gamma == null) return
      pointer.x = Math.max(-1, Math.min(1, e.gamma / 30))
      pointer.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30))
    }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    addEventListener('deviceorientation', orient, { passive: true })
    return () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('deviceorientation', orient)
    }
  }, [])

  const onEnter = useCallback(() => {
    setEntered(true)
    document.documentElement.classList.remove('is-loading')
    lenisRef.current?.start()
    ScrollTrigger.refresh()
  }, [])

  const goTo = useCallback((e, target) => {
    e.preventDefault()
    lenisRef.current?.scrollTo(target, { duration: target === '#topo' ? 2.4 : 3, easing: (t) => 1 - Math.pow(1 - t, 4) })
  }, [])

  const jump = useCallback((el, frac) => {
    const top = el.getBoundingClientRect().top + window.scrollY
    const y = top + frac * (el.offsetHeight - innerHeight)
    lenisRef.current?.scrollTo(y, { duration: 1.2 })
  }, [])

  const stepDown = useCallback(() => setTier((t) => (t === 'high' ? 'mid' : 'low')), [])
  const settings = noGL ? null : TIER_SETTINGS[tier]

  return (
    <>
      {film && (
        <Suspense fallback={null}>
          <Film manifest={stage.manifest} reduced={device.reduced} />
        </Suspense>
      )}
      {stage.kind === '3d' && !noGL && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}>
            <Scene settings={settings} reduced={device.reduced} onDecline={stepDown} />
          </Suspense>
        </div>
      )}
      <div id="veil" aria-hidden="true" />
      <Header goTo={goTo} />
      <Sections jump={jump} noGL={noGL && stage.kind === '3d'} />
      <div className="grain" aria-hidden="true" />
      <Cursor />
      {!entered && <Loader onEnter={onEnter} />}
    </>
  )
}
