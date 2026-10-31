import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
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
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        // a refração é renderizada em resolução reduzida (o desfoque natural esconde)
        gl.transmissionResolutionScale = settings.txScale
      }}
      camera={{ fov: 35, near: 0.05, far: 120, position: [0, 0.15, 7] }}
    >
      {/* se o FPS cair de forma consistente, desce um nível de qualidade */}
      <PerformanceMonitor bounds={(r) => (r > 90 ? [50, 80] : [38, 55])} onDecline={onDecline} flipflops={3} onFallback={onDecline} />
      <Experience settings={settings} reduced={reduced} />
    </Canvas>
  )
}
