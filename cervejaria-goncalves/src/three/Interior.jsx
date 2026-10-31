import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Bubbles from './Bubbles'
import { scroll, fx } from '../lib/store'
import { interiorPalette, makePalette } from './palette'
import { makeGrainGeometry, makeHopGeometry, makeYeastGeometry } from './geometry'
import { rayTexture } from './textures'

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFrag = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uDeep; uniform float uTime;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 c = mix(uDeep, uMid, smoothstep(-0.9, 0.15, h));
    c = mix(c, uTop, smoothstep(0.1, 0.95, h));
    // cáusticas suaves vindas da superfície
    float caus = sin(vDir.x * 18.0 + uTime * 0.7) * sin(vDir.z * 15.0 - uTime * 0.5) * 0.5 + 0.5;
    c += uTop * pow(caus, 6.0) * smoothstep(0.2, 0.9, h) * 0.25;
    gl_FragColor = vec4(c, 1.0);
  }
`

const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
const win = (p, a, b, f = 0.08) => ss(a - f, a + f, p) * (1 - ss(b - f, b + f, p))

function useField(count, spread) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        p: new THREE.Vector3(
          (Math.random() - 0.5) * spread[0],
          (Math.random() - 0.5) * spread[1],
          -3.4 - Math.random() * spread[2],
        ),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        s: 0.7 + Math.random() * 0.8,
        v: 0.3 + Math.random() * 0.7,
        seed: Math.random() * 100,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  )
}

const dummy = new THREE.Object3D()

function ProcessItems({ geometry, color, count, spread, mode, getK }) {
  const ref = useRef()
  const field = useField(count, spread)
  useFrame((state) => {
    const k = getK() * (1 - ss(0, 0.4, scroll.foam))
    const mesh = ref.current
    if (!mesh) return
    mesh.visible = k > 0.001 || fx.frames < 4
    if (k <= 0.001) return
    const t = state.clock.elapsedTime
    field.forEach((f, i) => {
      dummy.position.copy(f.p)
      if (mode === 'sink') dummy.position.y = f.p.y - ((t * f.v * 0.25 + f.seed) % 4) + 2
      if (mode === 'spin') dummy.position.y = f.p.y + Math.sin(t * f.v + f.seed) * 0.25
      if (mode === 'pulse') {
        dummy.position.x = f.p.x * (0.85 + Math.sin(t * 0.6 + f.seed) * 0.1)
        dummy.position.y = f.p.y + Math.sin(t * 1.3 + f.seed) * 0.1
      }
      dummy.rotation.set(f.r.x + t * 0.3 * f.v, f.r.y + t * 0.5 * f.v, f.r.z)
      const pulse = mode === 'pulse' ? 1 + Math.sin(t * 3 + f.seed) * 0.08 : 1
      dummy.scale.setScalar(f.s * k * pulse)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
    </instancedMesh>
  )
}

/** O mundo "dentro da cerveja": estilos, processo e espuma. */
export default function Interior({ settings, visibleRef }) {
  const group = useRef()
  const sky = useRef()
  const rays = useRef()
  const hemi = useRef()
  const bubbleU = useRef()
  const foamU = useRef()
  const pal = useMemo(makePalette, [])
  const { scene } = useThree()
  const size = useThree((s) => s.size)
  const portrait = size.width < size.height
  const spread = portrait ? [3.2, 5, 7] : [7, 4.5, 7]

  const grain = useMemo(makeGrainGeometry, [])
  const hop = useMemo(makeHopGeometry, [])
  const yeast = useMemo(makeYeastGeometry, [])
  const rayTex = useMemo(rayTexture, [])
  const skyU = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uDeep: { value: new THREE.Color() },
      uTime: { value: 0 },
    }),
    [],
  )
  const fog = useMemo(() => new THREE.FogExp2('#000', 0.02), [])

  useFrame((state) => {
    const on = visibleRef.current === 'interior'
    const warm = fx.frames < 4
    group.current.visible = on || warm
    scene.fog = on ? fog : null
    if (!on) return
    interiorPalette(pal)
    skyU.uTop.value.copy(pal.top)
    skyU.uMid.value.copy(pal.color)
    skyU.uDeep.value.copy(pal.deep)
    skyU.uTime.value = state.clock.elapsedTime
    sky.current.position.copy(state.camera.position)
    fog.color.copy(pal.color).lerp(pal.deep, 0.35)
    fog.density = pal.haze
    hemi.current.color.copy(pal.top)
    hemi.current.groundColor.copy(pal.deep)

    const travel = (scroll.styles * 1.0 + scroll.process * 1.2 + scroll.foam * 0.8) * 26
    const bu = bubbleU.current
    if (bu) {
      bu.uTravel.value = travel
      bu.uSpeed.value = 0.9 * pal.bubbles
      bu.uFogColor.value.copy(fog.color)
      bu.uFogDensity.value = pal.haze
      bu.uOpacity.value = 1 - ss(0.5, 1, scroll.foam) * 0.6
    }
    const fu = foamU.current
    if (fu) {
      fu.uTravel.value = travel * 0.6
      fu.uOpacity.value = ss(0.05, 0.6, scroll.foam)
      fu.uFogColor.value.copy(fog.color)
      fu.uFogDensity.value = 0.05
    }
    rays.current.children.forEach((m, i) => {
      m.material.color.copy(pal.top)
      m.material.opacity = (0.1 + Math.sin(state.clock.elapsedTime * 0.4 + i) * 0.04) * (1 - scroll.foam)
      m.rotation.z = -0.25 + i * 0.12 + Math.sin(state.clock.elapsedTime * 0.2 + i * 2) * 0.04
    })
  })

  const p = () => scroll.process
  return (
    <group ref={group} visible={false}>
      <mesh ref={sky} renderOrder={-10}>
        <sphereGeometry args={[40, 32, 24]} />
        <shaderMaterial
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={skyU}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <hemisphereLight ref={hemi} intensity={2.2} />
      <directionalLight position={[2, 6, 3]} intensity={1.6} color="#fff1d0" />

      <group ref={rays} position={[0, 4.5, -7]}>
        {[-4.5, -2.2, 0, 2.4, 4.8].map((x, i) => (
          <mesh key={i} position={[x, -2, -i * 0.8]}>
            <planeGeometry args={[1.4 + (i % 2) * 1.2, 14]} />
            <meshBasicMaterial
              map={rayTex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      <Bubbles
        uniformsRef={bubbleU}
        count={settings.interior}
        min={[-6, -5, -16]}
        max={[6, 5, 3]}
        speed={0.9}
        size={0.05}
        color="#fff8e4"
      />
      <Bubbles
        uniformsRef={foamU}
        count={settings.foam}
        min={[-5, -4, -10]}
        max={[5, 4, 3]}
        speed={0.25}
        size={0.16}
        color="#ffffff"
        opacity={0}
        renderOrder={11}
      />

      <ProcessItems geometry={grain} color="#C98A3E" count={settings.items} spread={spread} mode="sink" getK={() => win(p(), 0.1, 0.36)} />
      <ProcessItems geometry={hop} color="#7FA03A" count={Math.ceil(settings.items * 0.6)} spread={spread} mode="spin" getK={() => win(p(), 0.36, 0.68)} />
      <ProcessItems geometry={yeast} color="#F1DFAE" count={settings.items} spread={spread} mode="pulse" getK={() => win(p(), 0.68, 1.12)} />
    </group>
  )
}
