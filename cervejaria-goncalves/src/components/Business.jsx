import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CONTACT, wa } from '../data'

const SEGMENTS = [
  { name: 'Bares', text: 'Chope fresco no growler de 1 litro e a linha completa para o seu cardápio.' },
  { name: 'Restaurantes', text: 'Cinco estilos para harmonizar, do leve Helles ao Dunkel tostado.' },
  { name: 'Hotéis', text: 'Uma cerveja feita em Poços de Caldas para oferecer ao seu hóspede.' },
  { name: 'Mercados', text: 'Garrafas 600 ml que dispensam refrigeração no estoque, em caixas com 6.' },
  { name: 'Eventos', text: 'Orçamento sob medida para festas, feiras e encontros.' },
]

function useMagnet() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    const move = (e) => {
      const r = el.getBoundingClientRect()
      x((e.clientX - r.left - r.width / 2) * 0.25)
      y((e.clientY - r.top - r.height / 2) * 0.35)
    }
    const leave = () => (x(0), y(0))
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])
  return ref
}

export default function Business() {
  const [open, setOpen] = useState(0)
  const magnet = useMagnet()
  return (
    <section id="clientes" className="business" aria-labelledby="biz-title">
      <div className="biz-head">
        <h2 id="biz-title">Leve a Gonçalves para o seu balcão</h2>
        <p>Orçamentos, revenda e eventos. Fale direto com a cervejaria.</p>
      </div>

      <ul className="segments">
        {SEGMENTS.map((s, i) => (
          <li key={s.name} className={`segment ${open === i ? 'is-open' : ''}`}>
            <button
              className="segment-btn"
              aria-expanded={open === i}
              aria-controls={`seg-${i}`}
              onClick={() => setOpen(open === i ? -1 : i)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(i)}
            >
              <span className="segment-name">{s.name}</span>
              <span className="segment-plus" aria-hidden="true" />
            </button>
            <div className="segment-panel" id={`seg-${i}`}>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="cta">
        <a
          ref={magnet}
          className="wa-btn"
          href={wa('Olá! Vim pelo site da Cervejaria Gonçalves e quero um orçamento.')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.44 9.44 0 0 1-4.81-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.4 9.4 0 0 1-1.45-5.02c0-5.2 4.24-9.44 9.46-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.77 6.68c0 5.21-4.24 9.45-9.44 9.45m8.04-17.49A11.3 11.3 0 0 0 12.05.67C5.78.67.68 5.77.68 12.03c0 2 .52 3.96 1.52 5.68L.58 23.33l5.75-1.5a11.35 11.35 0 0 0 5.71 1.46h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03"
            />
          </svg>
          Chamar no WhatsApp
        </a>
        <ul className="contact-list">
          <li>
            <span>WhatsApp</span>
            <a href={wa('Olá! Vim pelo site da Cervejaria Gonçalves.')} target="_blank" rel="noopener noreferrer">
              {CONTACT.whatsappLabel}
            </a>
          </li>
          <li>
            <span>E-mail</span>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </li>
          <li>
            <span>Instagram</span>
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noopener noreferrer">
              @{CONTACT.instagram}
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
