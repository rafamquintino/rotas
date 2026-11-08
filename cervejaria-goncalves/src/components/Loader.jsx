import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import logo from '../assets/logo.webp'

const AGE_KEY = 'goncalves-maior-18'

/** Abertura: o miolo do selo enche de cerveja amarela; depois, confirmação de idade. */
export default function Loader({ onEnter }) {
  const [pct, setPct] = useState(0)
  const [stage, setStage] = useState('loading') // loading | gate | denied | leaving
  const root = useRef()

  useEffect(() => {
    const start = performance.now()
    let raf
    const tick = () => {
      const t = (performance.now() - start) / 1000
      const fontsOk = document.fonts?.status !== 'loading'
      const imgsOk = [...document.images].every((i) => i.complete)
      const ready = fontsOk && imgsOk && t > 1.2
      const target = ready ? 100 : 90 * (1 - Math.exp(-t / 0.7))
      setPct((p) => {
        const v = p + (target - p) * 0.14
        return ready && v > 99.5 ? 100 : v
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (pct < 100 || stage !== 'loading') return
    let ok = false
    try {
      ok = localStorage.getItem(AGE_KEY) === '1'
    } catch {}
    setStage(ok ? 'leaving' : 'gate')
  }, [pct, stage])

  useEffect(() => {
    if (stage === 'gate') root.current.querySelector('.gate .btn')?.focus()
    if (stage !== 'leaving') return
    const tl = gsap.timeline({ onComplete: onEnter })
    tl.to(root.current.querySelector('.loader-inner'), { scale: 0.9, opacity: 0, duration: 0.45, ease: 'power2.in' })
    tl.to(root.current, { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
  }, [stage, onEnter])

  const level = Math.min(100, pct)
  return (
    <div className="loader" ref={root} role="dialog" aria-modal="true" aria-label="Abrindo o site da Cervejaria Gonçalves">
      <div className="loader-inner">
        <div className="seal" aria-hidden="true">
          <img src={logo} alt="" className="seal-logo" style={{ opacity: level >= 100 ? 1 : 0 }} />
          <div className="seal-fill">
            <span className="seal-liquid" style={{ transform: `translateY(${100 - level}%)` }} />
            <span className="seal-word">
              GON
              <br />
              ÇAL
              <br />
              VES
            </span>
          </div>
        </div>

        {stage === 'loading' && (
          <p className="loader-pct" aria-live="polite">
            {Math.round(level)}
          </p>
        )}
        {stage === 'gate' && (
          <div className="gate">
            <p className="gate-q">Você tem 18 anos ou mais?</p>
            <div className="gate-actions">
              <button
                className="btn btn--yellow"
                onClick={() => {
                  try {
                    localStorage.setItem(AGE_KEY, '1')
                  } catch {}
                  setStage('leaving')
                }}
              >
                Sim, entrar
              </button>
              <button className="btn btn--line" onClick={() => setStage('denied')}>
                Ainda não
              </button>
            </div>
          </div>
        )}
        {stage === 'denied' && <p className="gate-denied">Volte quando fizer 18. A gente guarda um copo pra você.</p>}
      </div>
    </div>
  )
}
