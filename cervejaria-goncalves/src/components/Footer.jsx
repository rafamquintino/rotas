import logo from '../assets/logo.webp'

export default function Footer() {
  return (
    <footer className="footer">
      <img src={logo} alt="Cervejaria Gonçalves, cervejaria artesanal" width="96" height="96" />
      <p className="footer-quote">Somos criadores de experiências em forma líquida.</p>
      <p className="footer-place">Poços de Caldas, Minas Gerais. Desde 2013.</p>
      <p className="legal">Beba com moderação. Se beber, não dirija. Venda proibida para menores de 18 anos.</p>
    </footer>
  )
}
