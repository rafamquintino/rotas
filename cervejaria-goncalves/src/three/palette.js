import * as THREE from 'three'
import { BEERS } from '../lib/beers'
import { scroll } from '../lib/store'

const P = (color, top, deep, haze, bubbles) => ({
  color: new THREE.Color(color),
  top: new THREE.Color(top),
  deep: new THREE.Color(deep),
  haze,
  bubbles,
})

const beerPal = BEERS.map((b) => P(b.color, b.top, b.deep, b.haze, b.bubbles))
const processPal = [
  P('#9A4F12', '#E89A4A', '#2A1203', 0.06, 0.35), // mosto
  P('#9C8A2C', '#DCD47A', '#232205', 0.05, 0.5), // lúpulo
  P('#E0A43A', '#FFE19A', '#3E2304', 0.03, 1.6), // fermentação
]
const foamPal = P('#EFE1C2', '#FFFFFF', '#B89A62', 0.09, 1.2)

const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)

export function makePalette() {
  return P('#000', '#000', '#000', 0, 1)
}

function mixInto(out, a, b, t) {
  out.color.copy(a.color).lerp(b.color, t)
  out.top.copy(a.top).lerp(b.top, t)
  out.deep.copy(a.deep).lerp(b.deep, t)
  out.haze = THREE.MathUtils.lerp(a.haze, b.haze, t)
  out.bubbles = THREE.MathUtils.lerp(a.bubbles, b.bubbles, t)
  return out
}

function seq(out, list, p) {
  const f = THREE.MathUtils.clamp(p * list.length - 0.5, 0, list.length - 1)
  const i = Math.floor(f)
  const j = Math.min(i + 1, list.length - 1)
  return mixInto(out, list[i], list[j], ss(0.3, 0.7, f - i))
}

const tmpA = makePalette()
const tmpB = makePalette()

/** Paleta do "mundo dentro do copo" de acordo com o scroll. */
export function interiorPalette(out) {
  seq(tmpA, beerPal, scroll.styles)
  if (scroll.process > 0) {
    seq(tmpB, processPal, scroll.process)
    mixInto(tmpA, tmpA, tmpB, ss(0, 0.12, scroll.process))
  }
  if (scroll.foam > 0) mixInto(tmpA, tmpA, foamPal, ss(0.15, 0.85, scroll.foam))
  return mixInto(out, tmpA, tmpA, 0)
}

/** índice do estilo ativo (0..2) */
export const styleIndex = () => Math.min(2, Math.floor(scroll.styles * 3))
