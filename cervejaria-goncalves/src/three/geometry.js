import * as THREE from 'three'

import { GLASS_PROFILE as OUTER } from '../lib/profile'
const WALL = 0.022
export const GLASS = { bowlBottom: -0.62, rim: 1.12, fill: 0.7 }

const spline = new THREE.SplineCurve(OUTER.map(([r, y]) => new THREE.Vector2(r, y)))
const samples = spline.getSpacedPoints(160)

// raio interno na altura y (interpolação no perfil amostrado)
export function innerRadiusAt(y) {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]
    const b = samples[i]
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) {
      const t = (y - a.y) / (b.y - a.y || 1)
      return Math.max(0.01, THREE.MathUtils.lerp(a.x, b.x, t) - WALL)
    }
  }
  return 0.5
}

export function makeGlassGeometry() {
  const pts = samples.map((p) => p.clone())
  // lábio arredondado
  pts.push(new THREE.Vector2(0.6 - WALL * 0.5, GLASS.rim + 0.008))
  // parede interna descendo até o fundo do bojo
  const inner = []
  for (let y = GLASS.rim; y >= GLASS.bowlBottom; y -= 0.02) inner.push(new THREE.Vector2(innerRadiusAt(y), y))
  inner.push(new THREE.Vector2(0.0, GLASS.bowlBottom - 0.02))
  const geo = new THREE.LatheGeometry([...pts, ...inner], 96)
  geo.computeVertexNormals()
  return geo
}

export function makeLiquidGeometry(fill = GLASS.fill) {
  const pts = [new THREE.Vector2(0, GLASS.bowlBottom)]
  for (let y = GLASS.bowlBottom; y <= fill; y += 0.02) pts.push(new THREE.Vector2(innerRadiusAt(y) - 0.004, y))
  pts.push(new THREE.Vector2(innerRadiusAt(fill) - 0.004, fill))
  pts.push(new THREE.Vector2(0, fill))
  const geo = new THREE.LatheGeometry(pts, 72)
  geo.computeVertexNormals()
  return geo
}

// Colarinho: cilindro que segue a parede + domo irregular acima da borda
export function makeFoamGeometry(from = GLASS.fill) {
  const pts = []
  for (let y = from; y <= GLASS.rim; y += 0.02) pts.push(new THREE.Vector2(innerRadiusAt(y) - 0.002, y))
  const rTop = innerRadiusAt(GLASS.rim)
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2)
    pts.push(new THREE.Vector2(Math.cos(a) * rTop, GLASS.rim + Math.sin(a) * 0.085))
  }
  const geo = new THREE.LatheGeometry(pts, 72)
  // deforma com ruído para parecer espuma viva
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (v.y > GLASS.rim - 0.02) {
      const ang = Math.atan2(v.z, v.x)
      const n =
        Math.sin(ang * 7 + v.y * 20) * 0.012 + Math.sin(ang * 13 - v.y * 31) * 0.008 + Math.sin(ang * 3) * 0.01
      const k = 1 + n * 2
      v.x *= k
      v.z *= k
      v.y += n
    }
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

// Garrafa âmbar 600 ml (altura ≈ 3.6 unidades)
const BOTTLE = [
  [0.0, 0.0],
  [0.4, 0.0],
  [0.47, 0.05],
  [0.48, 0.2],
  [0.48, 1.95],
  [0.44, 2.25],
  [0.3, 2.6],
  [0.19, 2.85],
  [0.165, 3.05],
  [0.165, 3.3],
  [0.185, 3.34],
  [0.19, 3.4],
  [0.0, 3.4],
]
export function makeBottleGeometry() {
  const s = new THREE.SplineCurve(BOTTLE.map(([r, y]) => new THREE.Vector2(r, y)))
  const geo = new THREE.LatheGeometry(s.getSpacedPoints(90), 56)
  geo.computeVertexNormals()
  return geo
}

// Malte: grão de cevada (elipsoide pontudo)
export function makeGrainGeometry() {
  const g = new THREE.SphereGeometry(0.12, 14, 10)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const taper = 1 - Math.pow(Math.abs(y) / 0.12, 2) * 0.35
    p.setXYZ(i, x * 0.55 * taper, y * 1.9, z * 0.42 * taper - Math.abs(x) * 0.15)
  }
  g.computeVertexNormals()
  return g
}

// Lúpulo: cone de brácteas em espiral
export function makeHopGeometry() {
  const parts = []
  const n = 26
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const y = THREE.MathUtils.lerp(0.32, -0.28, t)
    const r = Math.sin(Math.PI * (0.15 + t * 0.8)) * 0.17
    const a = i * 2.4
    const leaf = new THREE.SphereGeometry(0.11, 8, 6)
    leaf.scale(1, 0.75, 0.32)
    leaf.rotateX(-0.6)
    leaf.translate(0, 0, r)
    leaf.rotateY(a)
    leaf.translate(0, y, 0)
    parts.push(leaf)
  }
  return mergeGeoms(parts)
}

// Levedura: célula com broto
export function makeYeastGeometry() {
  const a = new THREE.SphereGeometry(0.12, 16, 12)
  const b = new THREE.SphereGeometry(0.065, 12, 10)
  b.translate(0.13, 0.07, 0)
  return mergeGeoms([a, b])
}

function mergeGeoms(list) {
  // normais calculadas por peça (suaves) antes de juntar
  const nonIndexed = list.map((g) => {
    g.computeVertexNormals()
    return g.index ? g.toNonIndexed() : g
  })
  let total = 0
  nonIndexed.forEach((g) => (total += g.attributes.position.count))
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  let off = 0
  nonIndexed.forEach((g) => {
    pos.set(g.attributes.position.array, off)
    nor.set(g.attributes.normal.array, off)
    off += g.attributes.position.array.length
  })
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  return out
}
