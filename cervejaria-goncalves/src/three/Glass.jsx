import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import {
  makeGlassGeometry,
  makeLiquidGeometry,
  makeFoamGeometry,
  innerRadiusAt,
  GLASS,
} from './geometry'
import { glassPrintTexture } from './textures'
import Bubbles from './Bubbles'

/** Tulipa de chope procedural: vidro, cerveja, colarinho, estampa e bolhas. */
const Glass = forwardRef(function Glass({ settings, liquidMat, beerColor = '#E8A33D' }, ref) {
  const glassGeo = useMemo(makeGlassGeometry, [])
  const liquidGeo = useMemo(() => makeLiquidGeometry(), [])
  const foamGeo = useMemo(() => makeFoamGeometry(), [])
  const print = useMemo(glassPrintTexture, [])

  const printGeo = useMemo(() => {
    const r = 0.648
    const g = new THREE.CylinderGeometry(r, r, 0.62, 48, 1, true, -0.85, 1.7)
    return g
  }, [])

  const tx = settings.transmission

  return (
    <group ref={ref}>
      {/* vidro */}
      <mesh geometry={glassGeo} renderOrder={2}>
        {tx ? (
          <meshPhysicalMaterial
            transmission={1}
            thickness={0.08}
            roughness={0.02}
            ior={1.5}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={1.6}
            color="#fffaf0"
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshPhysicalMaterial
            color="#fff8ea"
            roughness={0.05}
            metalness={0}
            clearcoat={1}
            transparent
            opacity={0.08}
            envMapIntensity={2}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* cerveja */}
      <mesh geometry={liquidGeo} renderOrder={1}>
        {tx ? (
          <meshPhysicalMaterial
            ref={liquidMat}
            transmission={1}
            thickness={0.9}
            roughness={0.06}
            ior={1.34}
            color={beerColor}
            attenuationColor="#E8901C"
            attenuationDistance={0.85}
            emissive="#B8650F"
            emissiveIntensity={0.28}
            envMapIntensity={1.2}
            transparent
            depthWrite={false}
          />
        ) : (
          <meshPhysicalMaterial
            ref={liquidMat}
            color="#A9530A"
            emissive="#E08A1A"
            emissiveIntensity={0.32}
            roughness={0.12}
            clearcoat={1}
            transparent
            opacity={0.93}
            depthWrite={false}
          />
        )}
      </mesh>

      {/* colarinho */}
      <mesh geometry={foamGeo} renderOrder={3}>
        <meshStandardMaterial color="#F7EEDB" roughness={0.95} emissive="#3a2a10" emissiveIntensity={0.25} />
      </mesh>

      {/* estampa (placeholder do logo) */}
      <mesh geometry={printGeo} position={[0, 0.18, 0]} renderOrder={4}>
        <meshBasicMaterial map={print} transparent depthWrite={false} side={THREE.FrontSide} toneMapped={false} />
      </mesh>

      {/* bolhas subindo dentro do copo */}
      <Bubbles
        count={settings.glass}
        radius={innerRadiusAt(0.0) * 0.72}
        min={[0, GLASS.bowlBottom + 0.12, -1]}
        max={[0, GLASS.fill - 0.02, 1]}
        speed={0.32}
        size={0.016}
        color="#fff3cf"
        renderOrder={5}
      />
    </group>
  )
})

export default Glass
