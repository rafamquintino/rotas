import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const TEXT =
  'Desde 2013 em Poços de Caldas, criando cervejas autênticas, com identidade e alma. Do pequeno laboratório para o mundo.'

/** As palavras acendem conforme a leitura avança. */
export default function Manifesto() {
  const ref = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.mf-word',
        { opacity: 0.16 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top 70%', end: 'bottom 60%', scrub: true },
        },
      )
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="manifesto" ref={ref} aria-label="Sobre a cervejaria">
      <p className="mf-text">
        {TEXT.split(' ').map((w, i) => (
          <span key={i} className={`mf-word ${/2013|Poços|Caldas,|alma\./.test(w) ? 'mf-hi' : ''}`}>
            {w}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}
