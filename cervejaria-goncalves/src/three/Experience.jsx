import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Text } from '@react-three/drei'
import * as THREE from 'three'
import Glass from './Glass'
import Interior from './Interior'
import Bar from './Bar'
import { scroll, pointer, fx } from '../lib/store'
import { interiorPalette, makePalette } from './palette'
import { BEERS } from '../lib/beers'
import { backGlowTexture } from './textures'

const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
const lerp = THREE.MathUtils.lerp
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const FONT = `${import.meta.env.BASE_URL}fonts/stencil-900.woff`

const BREU = new THREE.Color('#120A04')
const BAR_BG = new THREE.Color('#1a0d05')
const CREAM_T = new THREE.Color('#F4EAD5')
const SWITCH = 0.82 // ponto do mergulho em que trocamos para o mundo interno

export default function Experience({ settings, reduced }) {
  const { camera, scene, size } = useThree()
  const glass = useRef()
  const glassWrap = useRef()
  const bar = useRef()
  const title = useRef()
  const glow = useRef()
  const glowTex = useMemo(backGlowTexture, [])
  const liquidMat = useRef()
  const keyLight = useRef()
  const world = useRef('exterior')
  const pal = useMemo(makePalette, [])
  const bg = useMemo(() => new THREE.Color('#120A04'), [])
  const veil = useMemo(() => document.getElementById('veil'), [])
  const camPos = useRef(V(0, 0.1, 7))
  const camLook = useRef(V(0, 0, 0))
  const tmpP = useMemo(() => V(0, 0, 0), [])
  const tmpL = useMemo(() => V(0, 0, 0), [])
  const lager = useMemo(() => new THREE.Color(BEERS[0].color), [])
  const cream = useMemo(() => new THREE.Color('#F4EAD5'), [])
  const veilColor = useMemo(() => new THREE.Color(), [])
  const titleColor = useMemo(() => new THREE.Color(), [])

  // aparelhos em retrato: câmera mais longe para o copo caber
  const aspect = size.width / size.height
  const D = aspect < 1 ? Math.min(1.75, 0.95 / aspect) : 1
  // "GONÇALVES" ocupa ~4.7x o fontSize em largura: ajusta para encostar nas bordas
  const heroZ = aspect < 1 ? 6.4 : 5.5
  const titleDist = heroZ * D + 2.4
  const wide = aspect > 1.2
  const titleSize = (2 * titleDist * Math.tan(THREE.MathUtils.degToRad(17.5)) * aspect * 0.96) / 4.7

  useEffect(() => {
    scene.background = bg
  }, [scene, bg])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    dt = Math.min(dt, 0.05)
    if (!fx.ready && ++fx.frames > 4) fx.ready = true
    fx.boost = Math.max(0, fx.boost - dt * 0.8)

    const { hero, dive, bar: barP } = scroll
    const interior = dive >= SWITCH && barP <= 0.001
    world.current = interior ? 'interior' : 'exterior'
    const inBar = barP > 0.001

    // ---------- câmera ----------
    if (!interior && !inBar) {
      // herói -> mergulho
      const h = ss(0, 1, hero)
      tmpP.set(0, lerp(0.15, 0.35, h), lerp(heroZ, heroZ * 0.88, h) * D)
      tmpL.set(0, lerp(0.05, 0.2, h), 0)
      const a = ss(0, 0.5, dive)
      const b = ss(0.45, SWITCH, dive)
      tmpP.lerp(V(0, 3.4, 1.9 * D), a)
      tmpL.lerp(V(0, 0.6, 0), a)
      tmpP.lerp(V(0, 0.85, 0.04), b)
      tmpL.lerp(V(0, -2, 0.02), b)
    } else if (interior) {
      tmpP.set(pointer.x * 0.35, pointer.y * 0.25 + Math.sin(t * 0.3) * 0.08, 0)
      tmpL.set(pointer.x * 0.8, 0.15 + scroll.foam * 1.6, -6)
    } else {
      // emergindo da espuma até a mesa de bar
      const e1 = ss(0, 0.55, barP)
      const e2 = ss(0.35, 1, barP)
      tmpP.set(0, 2.7, 0.35).lerp(V(0.6, 2.3, 3.4 * D), e1)
      tmpP.lerp(V((wide ? 0.6 : 2.3) + pointer.x * 0.25, 1.35 + pointer.y * 0.15, 6.2 * D), e2)
      tmpL.set(0, 0.9, 0).lerp(V(0.2, 0.3, 0), e1).lerp(V(wide ? -1.9 : 0.45, 0.1, -0.5), e2)
    }
    const k = 1 - Math.exp(-dt * (interior ? 4 : 6))
    // corta (sem damping) nas trocas de mundo, escondidas pelo véu
    const jump = camPos.current.distanceTo(tmpP) > 3
    if (jump) {
      camPos.current.copy(tmpP)
      camLook.current.copy(tmpL)
    } else {
      camPos.current.lerp(tmpP, k)
      camLook.current.lerp(tmpL, k)
    }
    camera.position.copy(camPos.current)
    camera.lookAt(camLook.current)

    // ---------- mundo externo ----------
    glassWrap.current.visible = !interior
    bar.current.visible = inBar
    title.current.visible = !interior && !inBar
    glow.current.visible = !interior && !inBar
    if (!interior) {
      const spin = reduced ? 0 : t * 0.35
      glass.current.rotation.y = inBar ? 0.5 + pointer.x * 0.2 : spin + pointer.x * 0.6
      glass.current.rotation.x = inBar ? 0 : pointer.y * 0.12
      glass.current.rotation.z = inBar ? 0 : -pointer.x * 0.08
      glass.current.position.y = inBar ? 0 : Math.sin(t * 0.8) * 0.04
      bg.copy(BREU).lerp(BAR_BG, ss(0, 0.6, barP))
      scene.background = bg
      if (keyLight.current) keyLight.current.intensity = lerp(2.2, 1.1, ss(0, 1, barP))
      // título sobe e escurece durante o mergulho
      // título opaco: entra na passada de transmissão e é refratado pelo copo
      const tm = title.current.material
      if (tm && tm.transparent) {
        tm.transparent = false
        tm.needsUpdate = true
      }
      title.current.position.y = 0.15 + ss(0, 0.6, dive) * 1.5
      titleColor.copy(CREAM_T).lerp(BREU, ss(0.2, 0.55, dive))
      title.current.color = titleColor.getHex()
    } else {
      interiorPalette(pal)
    }

    // ---------- véu de transição (DOM) ----------
    const vDive = 1 - Math.min(1, Math.abs(dive - SWITCH) / 0.16)
    const vFoam = ss(0.55, 1, scroll.foam) * (1 - ss(0, 0.35, barP))
    const vBarIn = barP > 0 ? 1 - ss(0, 0.35, barP) : 0
    const v = Math.max(dive < 1 ? vDive : 0, vFoam, vBarIn)
    if (scroll.foam > 0.3 || barP > 0) veilColor.copy(cream)
    else veilColor.copy(lager)
    if (veil) {
      veil.style.opacity = v.toFixed(3)
      veil.style.backgroundColor = `#${veilColor.getHexString()}`
    }
  })

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight ref={keyLight} position={[3, 4, 5]} intensity={2.2} color="#fff0d6" />
      <directionalLight position={[-4, 2, -3]} intensity={1.4} color="#E8A33D" />

      {settings.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[-3, 1, 3]} scale={[0.6, 6, 1]} color="#fff3dc" />
          <Lightformer form="rect" intensity={2.4} position={[3.5, 0.5, 2]} scale={[0.4, 6, 1]} color="#ffd8a0" />
          <Lightformer form="rect" intensity={1.5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[4, 4, 1]} color="#ffffff" />
          <Lightformer form="ring" intensity={1.2} position={[0, 0, -6]} scale={3} color="#E8A33D" />
        </Environment>
      )}

      <Text
        ref={title}
        font={FONT}
        fontSize={titleSize}
        letterSpacing={-0.02}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.15, -2.4]}
        color="#F4EAD5"
        aria-hidden
      >
        GONÇALVES
      </Text>

      <mesh ref={glow} position={[0, 0.1, -3.4]} renderOrder={-5}>
        <planeGeometry args={[aspect < 1 ? 9 : 12, aspect < 1 ? 9 : 12]} />
        <meshBasicMaterial map={glowTex} toneMapped={false} depthWrite={false} />
      </mesh>

      <group ref={glassWrap}>
        <Glass ref={glass} settings={settings} liquidMat={liquidMat} />
      </group>
      <Bar ref={bar} settings={settings} />
      <Interior settings={settings} visibleRef={world} />
    </>
  )
}
