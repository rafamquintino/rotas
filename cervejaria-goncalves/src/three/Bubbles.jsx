import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from '../lib/store'

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uTravel;
  uniform float uPixel;
  uniform vec3 uMin;
  uniform vec3 uRange;
  attribute float aSeed;
  attribute float aScale;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec3 p = position;
    float sp = (0.55 + aSeed * 0.9) * uSpeed;
    p.y = uMin.y + mod(p.y - uMin.y + uTime * sp, uRange.y);
    p.z = uMin.z + mod(p.z - uMin.z + uTravel, uRange.z);
    p.x += sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0) * 0.03 * (0.5 + aScale);
    // some perto das bordas para o wrap não aparecer
    float ty = (p.y - uMin.y) / uRange.y;
    float tz = (p.z - uMin.z) / uRange.z;
    vAlpha = smoothstep(0.0, 0.08, ty) * (1.0 - smoothstep(0.88, 1.0, ty)) * smoothstep(0.0, 0.12, tz) * (1.0 - smoothstep(0.9, 1.0, tz));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixel * (300.0 / max(0.2, -mv.z));
  }
`

const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    if (d > 1.0) discard;
    float rim = smoothstep(0.55, 0.92, d) * (1.0 - smoothstep(0.92, 1.0, d));
    float body = (1.0 - d) * 0.12;
    float spec = smoothstep(0.22, 0.0, length(uv - vec2(-0.16, -0.18)));
    float a = (rim * 0.75 + body + spec * 0.9) * vAlpha * uOpacity;
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    vec3 col = mix(uColor, uFogColor, fog);
    gl_FragColor = vec4(col, a * (1.0 - fog * 0.85));
  }
`

/**
 * Bolhas em point sprites. Posições dentro de uma caixa ou coluna (radius).
 */
export default function Bubbles({
  count = 500,
  min = [-1, -1, -1],
  max = [1, 1, 1],
  radius = null,
  speed = 0.4,
  size = 0.06,
  color = '#fff6dc',
  opacity = 1,
  uniformsRef,
  renderOrder = 10,
}) {
  const dpr = useThree((s) => s.viewport.dpr)
  const mat = useRef()

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const scale = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      if (radius) {
        const r = radius * Math.sqrt(Math.random())
        const a = Math.random() * Math.PI * 2
        pos[i * 3] = Math.cos(a) * r
        pos[i * 3 + 2] = Math.sin(a) * r
      } else {
        pos[i * 3] = THREE.MathUtils.lerp(min[0], max[0], Math.random())
        pos[i * 3 + 2] = THREE.MathUtils.lerp(min[2], max[2], Math.random())
      }
      pos[i * 3 + 1] = THREE.MathUtils.lerp(min[1], max[1], Math.random())
      seed[i] = Math.random()
      scale[i] = 0.25 + Math.pow(Math.random(), 3) * 1.6
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4)
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, radius])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uSize: { value: size },
      uTravel: { value: 0 },
      uPixel: { value: dpr },
      uMin: { value: new THREE.Vector3(...min) },
      uRange: { value: new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]) },
      uColor: { value: new THREE.Color(color) },
      uFogColor: { value: new THREE.Color(color) },
      uFogDensity: { value: 0 },
      uOpacity: { value: opacity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  if (uniformsRef) uniformsRef.current = uniforms

  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt, 0.05) * (1 + fx.boost * 4)
    uniforms.uPixel.value = dpr
  })

  return (
    <points geometry={geo} renderOrder={renderOrder} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}
