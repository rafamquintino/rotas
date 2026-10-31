import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { SCENES, TINTS } from './scenes'
import { scroll, fx } from '../lib/store'

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
// janela com bordas suaves no índice i de uma sequência de n (f = progresso * n)
const seg = (f, i, n, e = 0.12) =>
  (i === 0 ? 1 : ss(i - e, i + e, f)) * (i === n - 1 ? 1 : 1 - ss(i + 1 - e, i + 1 + e, f))

/** Peso (0..1) de cada cena de acordo com o scroll. */
function weights() {
  const { dive, styles, process, foam, bar } = scroll
  const gStyles = ss(0, 0.06, styles) * (1 - ss(0, 0.06, process))
  const gProc = ss(0, 0.06, process) * (1 - ss(0, 0.06, foam))
  return {
    hero: 1 - ss(0.35, 0.6, dive),
    mergulho: ss(0.25, 0.5, dive) * (1 - ss(0, 0.06, styles)),
    lager: gStyles * seg(styles * 3, 0, 3),
    ipa: gStyles * seg(styles * 3, 1, 3),
    weiss: gStyles * seg(styles * 3, 2, 3),
    malte: gProc * seg(process * 3, 0, 3),
    lupulo: gProc * seg(process * 3, 1, 3),
    fermentacao: gProc * seg(process * 3, 2, 3),
    espuma: ss(0, 0.08, foam) * (1 - ss(0, 0.3, bar)),
    bar: ss(0, 0.3, bar),
  }
}
const scrubProgress = { mergulho: () => scroll.dive, espuma: () => scroll.foam }

/**
 * Palco de vídeo real: um <video> por cena, empilhados, com opacidade ligada ao scroll.
 * Só os vídeos visíveis tocam; os outros ficam pausados.
 */
export default function Film({ manifest, reduced }) {
  const refs = useRef({})
  const portrait = useMemo(() => window.matchMedia('(orientation: portrait)').matches, [])
  const base = `${import.meta.env.BASE_URL}film/`

  // resolve fallbacks: cada cena aponta para um arquivo existente
  const layers = useMemo(() => {
    return SCENES.map((s) => {
      let src = manifest.scenes[s.key]
      let tint = null
      if (!src && s.fallback && manifest.scenes[s.fallback]) {
        src = manifest.scenes[s.fallback]
        tint = TINTS[s.key] || null
      }
      return src ? { ...s, file: portrait ? src.mobile : src.desktop, poster: portrait ? src.posterMobile : src.poster, duration: src.duration, tint } : null
    }).filter(Boolean)
  }, [manifest, portrait])

  useEffect(() => {
    const hero = refs.current.hero
    const markReady = () => (fx.ready = true)
    if (!hero) markReady()
    else if (hero.readyState >= 2) markReady()
    else hero.addEventListener('loadeddata', markReady, { once: true })
    const t = setTimeout(markReady, 5000)

    // depois que o herói carregou, pré-carrega as próximas cenas em ordem
    let i = 0
    const order = layers.map((l) => refs.current[l.key]).filter(Boolean)
    const next = () => {
      const v = order[i++]
      if (!v) return
      v.preload = 'auto'
      v.addEventListener('canplaythrough', next, { once: true })
      setTimeout(next, 4000)
    }
    const kick = setTimeout(next, 800)

    const state = {}
    const title = document.querySelector('.film-title')
    const tick = () => {
      const w = weights()
      if (title) title.style.opacity = (w.hero * (1 - ss(0, 0.25, scroll.dive))).toFixed(3)
      for (const l of layers) {
        const v = refs.current[l.key]
        if (!v) continue
        const op = w[l.key] || 0
        const st = (state[l.key] ||= { op: -1, t: 0 })
        if (Math.abs(st.op - op) > 0.002) {
          v.style.opacity = op.toFixed(3)
          v.style.visibility = op > 0.002 ? 'visible' : 'hidden'
          st.op = op
        }
        if (l.mode === 'loop') {
          if (op > 0.002 && v.paused && !reduced) v.play().catch(() => {})
          else if (op <= 0.002 && !v.paused) v.pause()
        } else if (op > 0.002 && v.readyState >= 1) {
          const dur = v.duration || l.duration || 1
          const target = scrubProgress[l.key]() * (dur - 0.05)
          st.t += (target - st.t) * 0.25
          if (!v.seeking && Math.abs(v.currentTime - st.t) > 1 / 40) v.currentTime = st.t
        }
      }
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      clearTimeout(t)
      clearTimeout(kick)
    }
  }, [layers, reduced])

  return (
    <div className="film" aria-hidden="true">
      <p className="film-title">GONÇALVES</p>
      {layers.map((l) => (
        <video
          key={l.key}
          ref={(el) => (refs.current[l.key] = el)}
          className={`film-layer film-layer--${l.key}`}
          src={base + l.file}
          poster={l.poster ? base + l.poster : undefined}
          muted
          playsInline
          loop={l.mode === 'loop'}
          preload={l.key === 'hero' ? 'auto' : 'metadata'}
          disablePictureInPicture
          style={{ opacity: 0, visibility: 'hidden', filter: l.tint || undefined }}
        />
      ))}
      <div className="film-shade" />
    </div>
  )
}
