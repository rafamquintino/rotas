import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import Experience from './Experience'

export default function Scene({ settings, reduced, onDecline }) {
  return (
    <Canvas
      dpr={settings.dpr}
      gl={{
        antialias: settings.aa,
        powerPreference: 'high-performance',
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 35, near: 0.05, far: 120, position: [0, 0.15, 7] }}
      flat={false}
    >
      <PerformanceMonitor onFallback={onDecline} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <Experience settings={settings} reduced={reduced} />
    </Canvas>
  )
}
