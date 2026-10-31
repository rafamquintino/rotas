import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import GlassSVG from './GlassSVG'
import { fx } from '../lib/store'

const AGE_KEY = 'goncalves-maior-18'

/** Tela de carregamento: copo enchendo + confirmação de maioridade. */
export default function Loader({ onEnter }) {
  const [pct, setPct] = useState(0)
  const [stage, setStage] = useState('loading') // loading | gate | denied | leaving
  const root = useRef()
  const state = useRef({ v: 0 })

  useEffect(() => {
    const s = state.current
    const start = performance.now()
    const minTime = start + 1100
    let raf
    const tick = () => {
      const fontsOk = document.fonts?.status !== 'loading'
      const done = fx.ready && fontsOk && performance.now() > minTime
      const el = (performance.now() - start) / 1000
      const target = done ? 100 : 92 * (1 - Math.exp(-el / 1.4))
      s.v += (target - s.v) * (done ? 0.12 : 0.2)
      if (done && s.v > 99.4) s.v = 100
      setPct(s.v)
      if (s.v >= 100) {
        setStage(localStorage.getItem(AGE_KEY) === '1' ? 'leaving' : 'gate')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (stage === 'gate') root.current.querySelector('.gate button')?.focus()
    if (stage !== 'leaving') return
    const tl = gsap.timeline({ onComplete: onEnter })
    tl.to(root.current.querySelector('.loader-inner'), { y: -40, opacity: 0, duration: 0.5, ease: 'power2.in' })
    tl.to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'expo.inOut' }, '-=0.1')
  }, [stage, onEnter])

  const level = Math.min(1, pct / 100)
  return (
    <div className="loader" ref={root} role="dialog" aria-modal="true" aria-label="Carregando o site">
      <div className="loader-inner">
        <GlassSVG level={level} foam={pct >= 100 ? 1 : 0} className="loader-glass" id="ld" />
        {stage === 'loading' && (
          <p className="loader-pct" aria-live="polite">
            <span>{Math.round(pct)}</span>
            <small>Tirando o chope</small>
          </p>
        )}
        {stage === 'gate' && (
          <div className="gate">
            <p className="gate-q">Você tem 18 anos ou mais?</p>
            <div className="gate-actions">
              <button
                className="btn btn--solid"
                onClick={() => {
                  localStorage.setItem(AGE_KEY, '1')
                  setStage('leaving')
                }}
              >
                Sim, quero entrar
              </button>
              <button className="btn btn--ghost" onClick={() => setStage('denied')}>
                Ainda não
              </button>
            </div>
          </div>
        )}
        {stage === 'denied' && (
          <p className="gate-q gate-denied">
            Então volte quando fizer 18. A gente guarda um copo pra você.
          </p>
        )}
      </div>
    </div>
  )
}
