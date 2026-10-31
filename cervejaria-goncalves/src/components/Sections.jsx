import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BEERS } from '../lib/beers'
import { scroll } from '../lib/store'
import { CONFIG, waLink } from '../lib/config'
import GlassSVG from './GlassSVG'

gsap.registerPlugin(ScrollTrigger)

export function LogoMark({ size = 40 }) {
  // PLACEHOLDER: substitua pelo logo oficial (SVG)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Logo provisório da Cervejaria Gonçalves">
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="24" y="33" textAnchor="middle" fontFamily="Big Shoulders Stencil Display" fontWeight="900" fontSize="27" fill="currentColor">
        G
      </text>
    </svg>
  )
}

const WaIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.44 9.44 0 0 1-4.81-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.4 9.4 0 0 1-1.45-5.02c0-5.2 4.24-9.44 9.46-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.77 6.68c0 5.21-4.24 9.45-9.44 9.45m8.04-17.49A11.3 11.3 0 0 0 12.05.67C5.78.67.68 5.77.68 12.03c0 2 .52 3.96 1.52 5.68L.58 23.33l5.75-1.5a11.35 11.35 0 0 0 5.71 1.46h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03"
    />
  </svg>
)

function useMagnet() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    const move = (e) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3)
      yTo((e.clientY - (r.top + r.height / 2)) * 0.4)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])
  return ref
}

export function Header({ goTo }) {
  return (
    <header className="site-header">
      <a href="#topo" className="brand" onClick={(e) => goTo(e, '#topo')}>
        <LogoMark size={36} />
        <span className="brand-name">
          Cervejaria
          <br />
          Gonçalves
        </span>
      </a>
      <a href="#clientes" className="header-cta" onClick={(e) => goTo(e, '#clientes')}>
        Seja nosso cliente
      </a>
    </header>
  )
}

function Hero({ noGL }) {
  return (
    <section id="topo" className="phase phase--hero" data-phase="hero">
      <div className="sticky">
        {noGL && (
          <div className="hero-fallback" aria-hidden="true">
            <span className="hero-fallback-title">GONÇALVES</span>
            <GlassSVG level={1} foam={1} className="hero-fallback-glass" id="hf" />
          </div>
        )}
        <div className="hero-copy" data-fade>
          <h1>
            <span className="sr-only">Cervejaria Gonçalves. </span>
            Cerveja artesanal feita em Poços de Caldas, a cidade que nasceu dentro de uma caldeira vulcânica.
          </h1>
          <p className="hero-formats">Lager, IPA e Weissbier. No chope e na garrafa de 600 ml.</p>
        </div>
        <div className="scroll-cue" data-fade>
          <span className="scroll-cue-line" />
          Role para mergulhar
        </div>
      </div>
    </section>
  )
}

function Dive() {
  const ref = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: true } })
        .fromTo('.dive-word', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power2.out', duration: 0.35 })
        .to('.dive-word', { scale: 7, opacity: 0, ease: 'power2.in', duration: 0.45 })
        .fromTo('.dive-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.2 }, 0.1)
        .to('.dive-sub', { opacity: 0, duration: 0.15 }, 0.5)
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="phase phase--dive" data-phase="dive" ref={ref}>
      <div className="sticky dive-inner">
        <p className="dive-word" aria-hidden="true">
          Mergulhe
        </p>
        <p className="dive-sub">Daqui pra frente, o caminho é por dentro do copo.</p>
      </div>
    </section>
  )
}

function Styles({ jump }) {
  const [idx, setIdx] = useState(0)
  const fills = useRef([])
  const ref = useRef()
  useEffect(() => {
    const fn = () => {
      const p = scroll.styles
      const i = Math.min(2, Math.floor(p * 3))
      setIdx((prev) => (prev === i ? prev : i))
      fills.current.forEach((el, k) => {
        if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, p * 3 - k))})`
      })
    }
    gsap.ticker.add(fn)
    return () => gsap.ticker.remove(fn)
  }, [])

  return (
    <section id="estilos" className="phase phase--styles" data-phase="styles" ref={ref}>
      <div className="sticky styles-inner">
        <nav className="style-tabs" aria-label="Estilos">
          {BEERS.map((b, i) => (
            <button
              key={b.id}
              className={`style-tab ${i === idx ? 'is-active' : ''}`}
              aria-current={i === idx}
              onClick={() => jump(ref.current, (i + 0.5) / 3)}
            >
              {b.name}
              <span className="style-tab-fill" ref={(el) => (fills.current[i] = el)} />
            </button>
          ))}
        </nav>

        {BEERS.map((b, i) => (
          <article key={b.id} className={`beer ${i === idx ? 'is-active' : ''}`} aria-hidden={i !== idx} style={{ '--c': b.color }}>
            <h2 className="beer-name" aria-label={b.name}>
              {b.name.split('').map((ch, k) => (
                <span key={k} className="ch" style={{ '--i': k }}>
                  {ch}
                </span>
              ))}
            </h2>
            <div className="beer-body">
              <p className="beer-tagline">{b.tagline}</p>
              <dl className="beer-notes">
                <div>
                  <dt>Cor</dt>
                  <dd>{b.cor}</dd>
                </div>
                <div>
                  <dt>Aroma</dt>
                  <dd>{b.aroma}</dd>
                </div>
                <div>
                  <dt>Sabor</dt>
                  <dd>{b.sabor}</dd>
                </div>
                <div>
                  <dt>Vai bem com</dt>
                  <dd>{b.harmoniza}</dd>
                </div>
              </dl>
              <p className="beer-spec">
                <span>{b.abv} de álcool</span>
                <span>{b.ibu} IBU</span>
                <span>Chope e garrafa 600 ml</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  {
    title: 'Malte',
    verb: 'Moagem e brassagem',
    text: 'A cevada maltada é moída e vai para a tina com água quente. Em cerca de uma hora, o amido vira açúcar e nasce o mosto, a base doce de toda cerveja.',
    spec: 'Mosturação a 65 °C',
  },
  {
    title: 'Lúpulo',
    verb: 'Fervura',
    text: 'O mosto ferve e o lúpulo entra em etapas: no começo para dar amargor, no fim para guardar o aroma. Na IPA, tem lúpulo até depois da fervura.',
    spec: '60 minutos de fervura',
  },
  {
    title: 'Fermentação',
    verb: 'Tanque e paciência',
    text: 'Já frio, o mosto recebe a levedura. Ela come o açúcar e devolve álcool, gás e o caráter de cada estilo: limpo na Lager, frutado na Weiss.',
    spec: '7 a 21 dias em tanque resfriado',
  },
]

function Process() {
  const ref = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray('.step')
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })
      steps.forEach((s, i) => {
        const at = i
        tl.fromTo(
          s,
          { clipPath: 'inset(100% 0 0 0)', y: 60 },
          { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 0.35, ease: 'power3.out' },
          at,
        )
        tl.fromTo(s.querySelector('.step-gauge-fill'), { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'none' }, at + 0.15)
        if (i < steps.length - 1) tl.to(s, { clipPath: 'inset(0 0 100% 0)', y: -60, duration: 0.3, ease: 'power3.in' }, at + 0.8)
      })
      tl.to({}, { duration: 0.3 })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section id="processo" className="phase phase--process" data-phase="process" ref={ref}>
      <div className="sticky process-inner">
        <h2 className="process-head">Como a gente faz</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-n" aria-hidden="true">
                {i + 1}
              </span>
              <div className="step-body">
                <h3 className="step-title">{s.title}</h3>
                <p className="step-verb">{s.verb}</p>
                <p className="step-text">{s.text}</p>
                <p className="step-spec">
                  <span className="step-gauge">
                    <span className="step-gauge-fill" />
                  </span>
                  {s.spec}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Foam() {
  const ref = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: true } })
        .fromTo('.foam-copy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 })
        .to('.foam-copy', { color: '#120A04', duration: 0.3 }, 0.35)
        .to('.foam-copy', { opacity: 0, y: -40, duration: 0.2 }, 0.75)
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="phase phase--foam" data-phase="foam" ref={ref}>
      <div className="sticky foam-inner">
        <div className="foam-copy">
          <h2>Subindo até a espuma</h2>
          <p>Dois dedos de colarinho seguram o gás e protegem o aroma. Servir bem também faz parte da receita.</p>
        </div>
      </div>
    </section>
  )
}

const SEGMENTS = [
  {
    name: 'Bares',
    offer: 'Chope em barril com chopeira, instalação e treinamento da equipe para tirar o colarinho certo.',
  },
  {
    name: 'Hotéis',
    offer: 'Uma cerveja da cidade para o frigobar, o restaurante e os eventos. Hóspede gosta de beber o lugar.',
  },
  {
    name: 'Restaurantes',
    offer: 'Chope ou garrafa 600 ml, com sugestões de harmonização montadas junto com a sua cozinha.',
  },
  {
    name: 'Mercados',
    offer: 'Garrafas 600 ml dos três estilos, com reposição direto da fábrica e material de gôndola.',
  },
]

// PLACEHOLDERS: troque pelos pontos de venda reais
const PLACES = [
  { name: 'Nome do bar', where: 'Centro, Poços de Caldas', kind: 'Chope' },
  { name: 'Nome do restaurante', where: 'Jardim dos Estados, Poços de Caldas', kind: 'Chope e garrafa' },
  { name: 'Nome do hotel', where: 'Bairro, Poços de Caldas', kind: 'Garrafa 600 ml' },
  { name: 'Nome do mercado', where: 'Bairro, cidade da região', kind: 'Garrafa 600 ml' },
]

function Clients() {
  const [open, setOpen] = useState(0)
  const magnet = useMagnet()
  return (
    <section id="clientes" className="clients" data-bar>
      <div className="clients-head">
        <h2>Leve a Gonçalves para o seu balcão</h2>
        <p>
          Atendemos bares, hotéis, restaurantes e mercados de Poços de Caldas e região. Conte o que você precisa e a
          gente monta o fornecimento com você.
        </p>
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
            <div className="segment-panel" id={`seg-${i}`} role="region">
              <p>{s.offer}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="cta">
        <a
          ref={magnet}
          className="wa-btn"
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          data-hot
        >
          <WaIcon />
          <span>Chamar no WhatsApp</span>
        </a>
        <p className="cta-note">Você fala direto com a cervejaria, sem formulário.</p>
      </div>

      <div className="photos">
        <figure className="ph">
          <div className="ph-box">
            <span>Foto: chope sendo tirado no balcão</span>
          </div>
          <figcaption>Substituir por foto real (vertical, 1200×1500 px)</figcaption>
        </figure>
        <figure className="ph">
          <div className="ph-box">
            <span>Foto: fábrica e tanques de fermentação</span>
          </div>
          <figcaption>Substituir por foto real (vertical, 1200×1500 px)</figcaption>
        </figure>
      </div>

      <div className="where">
        <h2>Onde encontrar</h2>
        <ul className="places">
          {PLACES.map((p) => (
            <li key={p.name}>
              <span className="place-name">{p.name}</span>
              <span className="place-where">{p.where}</span>
              <span className="place-kind">{p.kind}</span>
            </li>
          ))}
        </ul>
        <p className="where-note">
          Quer ver sua casa nesta lista?{' '}
          <a href={waLink('Olá! Quero vender a Cervejaria Gonçalves no meu estabelecimento.')} target="_blank" rel="noopener noreferrer">
            Fale com a gente
          </a>
          .
        </p>
      </div>

      <footer className="footer">
        <div className="footer-brand">
          <LogoMark size={56} />
          <p>
            Cervejaria Gonçalves
            <br />
            {CONFIG.endereco}
          </p>
        </div>
        <ul className="footer-links">
          <li>
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </li>
          <li>
            <a href={CONFIG.mapsUrl} target="_blank" rel="noopener noreferrer">
              Como chegar
            </a>
          </li>
          <li>
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </li>
        </ul>
        <p className="legal">
          Beba com moderação. Se beber, não dirija. Venda proibida para menores de 18 anos.
        </p>
      </footer>
    </section>
  )
}

export default function Sections({ jump, noGL }) {
  return (
    <main>
      <Hero noGL={noGL} />
      <Dive />
      <Styles jump={jump} />
      <Process />
      <Foam />
      <Clients />
    </main>
  )
}
