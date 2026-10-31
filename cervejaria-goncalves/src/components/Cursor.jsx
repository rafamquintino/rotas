import { useEffect, useRef } from 'react'

/** Cursor-bolha (só em mouse). Cresce sobre elementos interativos. */
export default function Cursor() {
  const dot = useRef()
  const ring = useRef()
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    const pos = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringPos = { ...pos }
    let raf
    const move = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
      const hot = e.target.closest?.('a, button, [data-hot]')
      ring.current.classList.toggle('is-hot', !!hot)
    }
    const down = () => ring.current.classList.add('is-down')
    const up = () => ring.current.classList.remove('is-down')
    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18
      ringPos.y += (pos.y - ringPos.y) * 0.18
      dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    loop()
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])
  return (
    <>
      <div className="cursor-dot" ref={dot} aria-hidden="true" />
      <div className="cursor-ring" ref={ring} aria-hidden="true" />
    </>
  )
}
