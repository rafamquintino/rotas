import * as THREE from 'three'

const STENCIL = '"Big Shoulders Stencil Display", Impact, sans-serif'
const DISPLAY = '"Big Shoulders Display", Impact, sans-serif'
const SERIF = '"Newsreader", Georgia, serif'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function finish(c, { repeat = false, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// Madeira de balcão de bar: veios horizontais, verniz escuro
export function woodTexture() {
  const [c, g] = canvas(1024, 512)
  g.fillStyle = '#3a1d0b'
  g.fillRect(0, 0, 1024, 512)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // tábuas
  for (let p = 0; p < 4; p++) {
    const y0 = p * 128
    const tone = 0.85 + rnd() * 0.3
    g.fillStyle = `rgba(${Math.floor(70 * tone)},${Math.floor(36 * tone)},${Math.floor(14 * tone)},1)`
    g.fillRect(0, y0, 1024, 128)
    for (let i = 0; i < 70; i++) {
      const y = y0 + rnd() * 128
      const amp = 2 + rnd() * 6
      const freq = 0.004 + rnd() * 0.01
      g.strokeStyle = `rgba(${20 + rnd() * 30},${8 + rnd() * 12},2,${0.15 + rnd() * 0.35})`
      g.lineWidth = 0.5 + rnd() * 2.2
      g.beginPath()
      for (let x = 0; x <= 1024; x += 8) {
        const yy = y + Math.sin(x * freq + i) * amp + Math.sin(x * freq * 3.1) * amp * 0.3
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy)
      }
      g.stroke()
    }
    g.fillStyle = 'rgba(8,3,0,0.85)'
    g.fillRect(0, y0, 1024, 2)
  }
  // brilho de verniz
  const grd = g.createLinearGradient(0, 0, 0, 512)
  grd.addColorStop(0, 'rgba(255,190,110,0.05)')
  grd.addColorStop(0.5, 'rgba(255,190,110,0)')
  grd.addColorStop(1, 'rgba(0,0,0,0.2)')
  g.fillStyle = grd
  g.fillRect(0, 0, 1024, 512)
  const t = finish(c, { repeat: true, aniso: 8 })
  t.repeat.set(2, 1.2)
  return t
}

// Rótulo de garrafa (PLACEHOLDER até chegar a arte oficial)
export function labelTexture(beer) {
  const [c, g] = canvas(1024, 512)
  g.fillStyle = '#F1E6CC'
  g.fillRect(0, 0, 1024, 512)
  // faixa da cor do estilo
  g.fillStyle = beer.color
  g.fillRect(0, 330, 1024, 120)
  g.fillStyle = '#120A04'
  g.fillRect(0, 322, 1024, 8)
  g.fillRect(0, 450, 1024, 8)
  g.textAlign = 'center'
  g.fillStyle = '#120A04'
  g.font = `900 150px ${STENCIL}`
  g.fillText('GONÇALVES', 512, 200)
  g.font = `italic 400 40px ${SERIF}`
  g.fillText('cervejaria artesanal, Poços de Caldas', 512, 270)
  g.font = `800 92px ${DISPLAY}`
  g.fillStyle = beer.id === 'weiss' ? '#120A04' : '#F4EAD5'
  g.fillText(beer.name, 512, 420)
  g.fillStyle = '#120A04'
  g.font = `700 34px ${DISPLAY}`
  g.fillText(`600 ml  /  ${beer.abv} ABV`, 512, 500)
  return finish(c)
}

// Estampa no copo (gira com o copo, revela a rotação)
export function glassPrintTexture() {
  const [c, g] = canvas(1024, 512)
  g.clearRect(0, 0, 1024, 512)
  g.fillStyle = 'rgba(244,234,213,0.92)'
  g.textAlign = 'center'
  // brasão placeholder: G dentro de um círculo
  g.lineWidth = 10
  g.strokeStyle = 'rgba(244,234,213,0.92)'
  g.beginPath()
  g.arc(512, 170, 120, 0, Math.PI * 2)
  g.stroke()
  g.font = `900 190px ${STENCIL}`
  g.fillText('G', 512, 238)
  g.font = `900 92px ${STENCIL}`
  g.fillText('GONÇALVES', 512, 400)
  g.font = `italic 400 36px ${SERIF}`
  g.fillText('Poços de Caldas, MG', 512, 460)
  return finish(c)
}

// Gradiente suave para raios de luz e bokeh
export function softSprite() {
  const [c, g] = canvas(128, 128)
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return finish(c)
}

// Contraluz opaca: âmbar no centro, cor exata do fundo nas bordas
export function backGlowTexture() {
  const [c, g] = canvas(512, 512)
  const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256)
  grd.addColorStop(0, '#D9861F')
  grd.addColorStop(0.25, '#8F4A0E')
  grd.addColorStop(0.6, '#2E1606')
  grd.addColorStop(1, '#120A04')
  g.fillStyle = grd
  g.fillRect(0, 0, 512, 512)
  return finish(c)
}

export function rayTexture() {
  const [c, g] = canvas(64, 256)
  const v = g.createLinearGradient(0, 0, 0, 256)
  v.addColorStop(0, 'rgba(255,255,255,1)')
  v.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = v
  g.fillRect(0, 0, 64, 256)
  g.globalCompositeOperation = 'destination-in'
  const h = g.createLinearGradient(0, 0, 64, 0)
  h.addColorStop(0, 'rgba(0,0,0,0)')
  h.addColorStop(0.5, 'rgba(0,0,0,1)')
  h.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = h
  g.fillRect(0, 0, 64, 256)
  return finish(c)
}
