import { GLASS_PROFILE } from '../lib/profile'

// Converte o perfil do copo 3D em um caminho SVG (viewBox 0 0 120 200)
const X = (r, side) => 60 + side * r * 72
const Y = (y) => 190 - (y + 1.1) * 80
const right = GLASS_PROFILE.map(([r, y]) => `${X(r, 1).toFixed(1)},${Y(y).toFixed(1)}`)
const left = [...GLASS_PROFILE].reverse().map(([r, y]) => `${X(r, -1).toFixed(1)},${Y(y).toFixed(1)}`)
export const GLASS_PATH = `M${right.join(' L')} L${left.join(' L')} Z`
// interior do bojo (para recortar o líquido)
const bowl = GLASS_PROFILE.filter(([, y]) => y >= -0.64)
const ri = bowl.map(([r, y]) => `${X(r - 0.04, 1).toFixed(1)},${Y(y).toFixed(1)}`)
const li = [...bowl].reverse().map(([r, y]) => `${X(r - 0.04, -1).toFixed(1)},${Y(y).toFixed(1)}`)
export const BOWL_PATH = `M${ri.join(' L')} L${li.join(' L')} Z`
export const BOWL_BOTTOM = Y(-0.64)
export const FILL_TOP = Y(0.72)
export const RIM = Y(1.12)

/** Copo em SVG com nível de cerveja (0..1). */
export default function GlassSVG({ level = 0, foam = 0, className = '', id = 'g' }) {
  const h = (BOWL_BOTTOM - FILL_TOP) * level
  const top = BOWL_BOTTOM - h
  return (
    <svg className={className} viewBox="0 0 120 200" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-bowl`}>
          <path d={BOWL_PATH} />
        </clipPath>
        <linearGradient id={`${id}-beer`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6C25E" />
          <stop offset="1" stopColor="#B8650F" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-bowl)`}>
        <rect x="0" y={top} width="120" height={h + 2} fill={`url(#${id}-beer)`} />
        {level > 0.05 &&
          [22, 38, 52, 66, 80, 94].map((x, i) => (
            <circle key={i} className="svg-bubble" cx={x} cy={BOWL_BOTTOM - 4} r={1 + (i % 3) * 0.6} style={{ animationDelay: `${i * 0.37}s` }} />
          ))}
        <rect
          x="0"
          y={top - 26 * foam}
          width="120"
          height={26 * foam + 1}
          fill="#F4EAD5"
          style={{ transition: 'all .6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </g>
      {foam > 0.5 && (
        <path
          d={`M${X(0.56, -1)},${RIM + 6} Q${X(0.3, -1)},${RIM - 12} 60,${RIM - 8} Q${X(0.3, 1)},${RIM - 14} ${X(0.56, 1)},${RIM + 6} Z`}
          fill="#F4EAD5"
          className="svg-foam-dome"
        />
      )}
      <path d={GLASS_PATH} fill="none" stroke="#F4EAD5" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
