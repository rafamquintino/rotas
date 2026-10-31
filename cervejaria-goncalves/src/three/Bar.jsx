import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import Bottle from './Bottle'
import { woodTexture, softSprite, glassPrintTexture } from './textures'
import { BEERS } from '../lib/beers'

function Bokeh({ count }) {
  const sprite = useMemo(softSprite, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const warm = ['#FFB547', '#FF8A2B', '#FFD9A0', '#E8A33D', '#FFF0D0'].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26
      pos[i * 3 + 1] = -0.5 + Math.random() * 6
      pos[i * 3 + 2] = -7 - Math.random() * 9
      const c = warm[i % warm.length]
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        size={1.6}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

/** Mesa de bar: balcão de madeira, garrafas 600 ml, bolacha e luzes desfocadas. */
const Bar = forwardRef(function Bar({ settings }, ref) {
  const wood = useMemo(woodTexture, [])
  const print = useMemo(glassPrintTexture, [])
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, -1.1 - 0.15, -1]} receiveShadow>
        <boxGeometry args={[22, 0.3, 9]} />
        <meshStandardMaterial map={wood} roughness={0.35} metalness={0.05} envMapIntensity={0.8} />
      </mesh>
      {/* bolacha de chope */}
      <mesh position={[0, -1.095, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.012, 48]} />
        <meshStandardMaterial color="#C2571A" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.087, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 48]} />
        <meshBasicMaterial map={print} transparent depthWrite={false} />
      </mesh>

      <Bottle beer={BEERS[0]} position={[-1.55, -1.1, -1.5]} rotation={[0, 0.35, 0]} />
      <Bottle beer={BEERS[1]} position={[1.35, -1.1, -1.1]} rotation={[0, -0.4, 0]} />
      <Bottle beer={BEERS[2]} position={[2.55, -1.1, -2.3]} rotation={[0, -0.7, 0]} />

      {/* tampinha largada no balcão */}
      <mesh position={[0.95, -1.08, 0.75]} rotation={[0.1, 0, 0.2]}>
        <cylinderGeometry args={[0.2, 0.21, 0.05, 20]} />
        <meshStandardMaterial color="#b9b1a3" metalness={0.9} roughness={0.35} />
      </mesh>

      <Bokeh count={settings.bokeh} />
      <spotLight position={[1.5, 6, 2.5]} angle={0.6} penumbra={0.8} intensity={60} color="#FFC77A" distance={20} decay={1.6} />
      <pointLight position={[-4, 1.5, -3]} intensity={8} color="#FF8A2B" distance={12} />
    </group>
  )
})

export default Bar
