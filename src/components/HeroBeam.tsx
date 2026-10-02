import { useEffect, useRef } from 'react'

/**
 * Subtle light beam that follows the cursor inside its parent.
 * Only active on devices with a fine pointer that can hover (desktop).
 */
export function HeroBeam() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host) return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!mq.matches || reduce.matches) return
    let frame = 0
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--x', `${e.clientX - r.left}px`)
        el.style.setProperty('--y', `${e.clientY - r.top}px`)
        el.style.opacity = '1'
      })
    }
    const leave = () => (el.style.opacity = '0')
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgb(140 110 255 / 0.18), rgb(70 110 255 / 0.08) 40%, transparent 70%)',
      }}
    />
  )
}
