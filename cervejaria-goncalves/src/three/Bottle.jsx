import { useMemo } from 'react'
import * as THREE from 'three'
import { makeBottleGeometry } from './geometry'
import { labelTexture } from './textures'

/** Garrafa âmbar 600 ml procedural com rótulo placeholder. */
export default function Bottle({ beer, ...props }) {
  const geo = useMemo(makeBottleGeometry, [])
  const label = useMemo(() => labelTexture(beer), [beer])
  const labelGeo = useMemo(() => new THREE.CylinderGeometry(0.485, 0.485, 1.05, 48, 1, true, -1.25, 2.5), [])
  const neckGeo = useMemo(() => new THREE.CylinderGeometry(0.172, 0.19, 0.32, 32, 1, true, -1.2, 2.4), [])

  return (
    <group {...props}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial
          color="#2a1203"
          roughness={0.08}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          sheen={0.4}
          sheenColor="#a0521a"
          envMapIntensity={2.2}
        />
      </mesh>
      <mesh geometry={labelGeo} position={[0, 1.05, 0]}>
        <meshStandardMaterial map={label} roughness={0.7} />
      </mesh>
      <mesh geometry={neckGeo} position={[0, 2.95, 0]}>
        <meshStandardMaterial color={beer.color} roughness={0.5} />
      </mesh>
      {/* tampinha */}
      <mesh position={[0, 3.44, 0]}>
        <cylinderGeometry args={[0.2, 0.205, 0.09, 24]} />
        <meshStandardMaterial color="#b9b1a3" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}
