// Detecta a capacidade do aparelho para escalar partículas e efeitos.
// 'high' | 'mid' | 'low' | 'none' (sem WebGL)
export function detectTier() {
  const forced = new URLSearchParams(location.search).get('tier')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const mobile = coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const saveData = navigator.connection?.saveData === true

  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return { tier: 'none', reduced, mobile }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    return { tier: 'none', reduced, mobile }
  }

  const weakGpu =
    /Mali-4|Mali-T[0-8]|Mali-G(31|51|52|57)|Adreno \(TM\) [1-5]\d\d|Adreno [1-5]\d\d|PowerVR|SGX|SwiftShader|llvmpipe|Software|Intel.*HD Graphics [2-5]\d{2,3}/i.test(
      gpu,
    )

  let score = 3
  if (mobile) score -= 1
  if (cores <= 4) score -= 1
  if (mem <= 3) score -= 1
  if (weakGpu) score -= 2
  if (saveData || reduced) score -= 1

  if (['high', 'mid', 'low', 'none'].includes(forced)) return { tier: forced, reduced, mobile, gpu }
  const tier = score >= 3 ? 'high' : score >= 1 ? 'mid' : 'low'
  return { tier, reduced, mobile, gpu }
}

export const TIER_SETTINGS = {
  high: { dpr: [1, 2], interior: 1500, glass: 180, foam: 260, items: 30, bokeh: 60, transmission: true, aa: true, env: true },
  mid: { dpr: [1, 1.5], interior: 750, glass: 110, foam: 150, items: 20, bokeh: 36, transmission: true, aa: true, env: true },
  low: { dpr: [1, 1], interior: 280, glass: 50, foam: 70, items: 10, bokeh: 18, transmission: false, aa: false, env: true },
}
