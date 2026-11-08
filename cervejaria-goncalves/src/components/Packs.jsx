import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import growler from '../assets/lager-growler.webp'
import bottle from '../assets/lager-600.webp'

/** Growler e garrafa, lado a lado na proporção real. */
export default function Packs() {
  const ref = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.pack-img', {
        yPercent: 30,
        opacity: 0,
        stagger: 0.12,
        ease: 'power3.out',
        duration: 1,
        scrollTrigger: { trigger: ref.current, start: 'top 70%' },
      })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="packs" ref={ref} aria-labelledby="packs-title">
      <h2 id="packs-title" className="packs-title">
        Duas formas de levar
      </h2>
      <div className="packs-grid">
        <article className="pack">
          <img className="pack-img pack-img--growler" src={growler} alt="Growler 1 L da Lazy Duck" />
          <h3>Growler 1&nbsp;L</h3>
          <p>Chope fresco numa embalagem descartável. Disponível em toda a linha, em caixas com 12.</p>
        </article>
        <article className="pack">
          <img className="pack-img pack-img--bottle" src={bottle} alt="Garrafa 600 ml da Lazy Duck" />
          <h3>Garrafa 600&nbsp;ml</h3>
          <p>Não retornável e dispensa refrigeração no estoque. Vendida em caixas com 6.</p>
        </article>
      </div>
    </section>
  )
}
