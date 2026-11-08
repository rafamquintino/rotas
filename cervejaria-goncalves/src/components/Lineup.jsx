import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BEERS } from '../data'

/**
 * "O elenco": as cinco cervejas passam na horizontal enquanto a página rola na vertical.
 * Cada painel tem a cor do próprio rótulo.
 */
export default function Lineup() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    const ctx = gsap.context(() => {
      const track = el.querySelector('.lineup-track')
      const dist = () => track.scrollWidth - innerWidth
      const move = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: el.querySelector('.lineup-pin'),
          scrub: 0.5,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (v) => {
              const d = dist()
              const pts = [...track.children].map((c) => Math.min(1, c.offsetLeft / d))
              return pts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), 0)
            },
            duration: { min: 0.25, max: 0.7 },
            delay: 0.08,
            ease: 'power2.inOut',
          },
          onUpdate: (s) => {
            const i = Math.min(BEERS.length - 1, Math.max(0, Math.round(s.progress * BEERS.length - 0.5)))
            el.querySelector('.lineup-count b').textContent = BEERS[i].n
            el.querySelector('.lineup-bar i').style.transform = `scaleX(${s.progress})`
          },
        },
      })
      // garrafas giram de leve ao atravessar a tela
      el.querySelectorAll('.beer-bottles').forEach((b) => {
        gsap.fromTo(
          b,
          { rotate: 7, xPercent: 18 },
          {
            rotate: -5,
            xPercent: -18,
            ease: 'none',
            scrollTrigger: { trigger: b, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
          },
        )
      })
      el.querySelectorAll('.beer-name').forEach((n) => {
        gsap.fromTo(
          n,
          { xPercent: 8 },
          {
            xPercent: -4,
            ease: 'none',
            scrollTrigger: { trigger: n, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
          },
        )
      })
    }, el)
    const onLoad = () => ScrollTrigger.refresh()
    addEventListener('load', onLoad)
    return () => {
      removeEventListener('load', onLoad)
      ctx.revert()
    }
  }, [])

  return (
    <section id="elenco" className="lineup" ref={ref} aria-label="As cervejas da Gonçalves">
      <div className="lineup-pin">
        <div className="lineup-track">
          <div className="lineup-intro">
            <h2>
              Cinco cervejas,
              <br />
              cinco personagens.
            </h2>
            <p>Cada rótulo da Gonçalves tem uma história. Role para conhecer a linha.</p>
          </div>
          {BEERS.map((b) => (
            <article key={b.n} className="beer" style={{ '--bg': b.bg, '--ink': b.ink, '--accent': b.accent }} aria-label={`${b.name}, ${b.style}`}>
              <div className="beer-head">
                <p className="beer-kind">
                  <span className="beer-n">{b.n}</span> {b.kind}
                  {b.seasonal && <span className="beer-tag">Sazonal, consulte a disponibilidade</span>}
                </p>
                <h3 className="beer-name">{b.name}</h3>
              </div>
              <div className="beer-bottles">
                {b.images.map((src, k) => (
                  <img key={k} src={src} alt={k === 0 && b.images.length > 1 ? `Growler 1 L da ${b.name}` : `${b.packs[k] || b.packs[0]} da ${b.name}`} />
                ))}
              </div>
              <div className="beer-info">
                <dl className="beer-data">
                  <div>
                    <dt>Estilo</dt>
                    <dd>{b.style}</dd>
                  </div>
                  <div>
                    <dt>Álcool</dt>
                    <dd>{b.abv}</dd>
                  </div>
                  <div>
                    <dt>IBU</dt>
                    <dd>{b.ibu}</dd>
                  </div>
                  <div>
                    <dt>Escola</dt>
                    <dd>{b.origin}</dd>
                  </div>
                </dl>
                <p className="beer-text">{b.text}</p>
                <ul className="beer-packs" aria-label="Embalagens">
                  {b.packs.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="lineup-hud" aria-hidden="true">
          <span className="lineup-count">
            <b>01</b> / 05
          </span>
          <span className="lineup-bar">
            <i />
          </span>
        </div>
      </div>
    </section>
  )
}
