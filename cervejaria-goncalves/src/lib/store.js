// Estado mutável compartilhado entre DOM (GSAP) e 3D (useFrame), sem re-render do React.
export const scroll = {
  hero: 0,
  dive: 0,
  styles: 0,
  process: 0,
  foam: 0,
  bar: 0,
}
export const pointer = { x: 0, y: 0 }
export const fx = { boost: 0, ready: false, frames: 0 }
