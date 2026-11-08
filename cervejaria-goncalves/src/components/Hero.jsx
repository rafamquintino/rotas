import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import logo from '../assets/logo.webp'
import { BEERS } from '../data'

// proporção do miolo amarelo no selo (medida no arquivo do logo)
const CORE = 0.59

/**
 * Abertura: a tela inteira é o miolo amarelo do selo. Ao rolar, o amarelo se fecha
 * num círculo, o GON/ÇAL/VES encolhe junto e o selo real aparece em volta.
 */
export default function Hero() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const r = () => Math.min(innerWidth, innerHeight) * 0.19 // raio final do miolo
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.4 },
          defaults: { ease: 'none' },
        })
        tl.fromTo(
          '.hero-disc',
          { '--r': () => Math.hypot(innerWidth, innerHeight) / 2 + 'px' },
          { '--r': () => r() + 'px', duration: 0.55, ease: 'power2.inOut' },
          0,
        )
          .fromTo(
            '.hero-word',
            { scale: 1 },
            { scale: () => (r() * 1.32) / document.querySelector('.hero-word').offsetHeight, duration: 0.55, ease: 'power2.inOut' },
            0,
          )
          .to('.hero-meta, .hero-shelf', { opacity: 0, y: 40, duration: 0.25 }, 0)
          .fromTo('.hero-seal', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.15 }, 0.5)
          .to('.hero-word', { opacity: 0, duration: 0.1 }, 0.6)
          .fromTo('.hero-after', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 0.66)
          .to({}, { duration: 0.14 })
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="topo" className="hero" ref={ref}>
      <div className="hero-sticky">
        <div className="hero-disc">
          <h1 className="hero-word">
            <span className="sr-only">Cervejaria Gonçalves</span>
            <span aria-hidden="true">
              GON
              <br />
              ÇAL
              <br />
              VES
            </span>
          </h1>
        </div>
        <img
          className="hero-seal"
          src={logo}
          alt=""
          style={{ '--size': `calc(min(100vw, 100svh) * 0.38 / ${CORE})` }}
        />
        <p className="hero-meta">
          Cervejaria artesanal
          <br />
          de Poços de Caldas, desde 2013
        </p>
        <div className="hero-shelf" aria-hidden="true">
          {BEERS.map((b) => (
            <img key={b.n} src={b.images[b.images.length - 1]} alt="" />
          ))}
        </div>
        <p className="hero-after">Somos criadores de experiências em forma líquida.</p>
      </div>
    </section>
  )
}
