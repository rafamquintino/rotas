import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import logo from '../assets/logo.webp'

export default function Header({ goTo }) {
  const ref = useRef()
  // o selo do cabeçalho só aparece quando a abertura termina de virar o selo
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '#topo',
      start: 'bottom 25%',
      onToggle: (s) => ref.current.classList.toggle('is-on', s.isActive || s.progress === 1),
      onLeave: () => ref.current.classList.add('is-on'),
      onEnterBack: () => ref.current.classList.add('is-on'),
      onLeaveBack: () => ref.current.classList.remove('is-on'),
      end: 'max',
    })
    return () => st.kill()
  }, [])
  return (
    <header className="site-header" ref={ref}>
      <a
        href="#topo"
        className="header-seal"
        aria-label="Cervejaria Gonçalves, voltar ao início"
        onClick={(e) => {
          e.preventDefault()
          goTo(0)
        }}
      >
        <img src={logo} alt="" width="48" height="48" />
      </a>
      <nav className="header-nav" aria-label="Seções">
        <a href="#elenco" onClick={(e) => (e.preventDefault(), goTo('#elenco'))}>
          Cervejas
        </a>
        <a href="#clientes" className="header-cta" onClick={(e) => (e.preventDefault(), goTo('#clientes'))}>
          Seja nosso cliente
        </a>
      </nav>
    </header>
  )
}
