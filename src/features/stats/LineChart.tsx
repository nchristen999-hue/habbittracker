import { useId, useMemo, useState } from 'react'
import { formatShort, type DateKey } from '@/lib/date'
import { formatNumber } from '@/lib/logic'
import { useWidth } from './useWidth'

export interface LinePoint {
  key: DateKey
  value: number | undefined
  target: number
  met: boolean
}

const H = 220
const PAD = { top: 16, right: 48, bottom: 28, left: 40 }

function niceMax(v: number) {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  const nice = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => f <= s) ?? 10
  return nice * exp
}

const compact = (n: number) =>
  new Intl.NumberFormat('de-DE', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n)

/**
 * Logged values over time (one series, 2px line + 10 % wash) with the target as a
 * stepped reference line. Crosshair + tooltip on hover/touch.
 */
export function LineChart({ points, unit, label }: { points: LinePoint[]; unit: string; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()

  const geo = useMemo(() => {
    const w = Math.max(width - PAD.left - PAD.right, 10)
    const h = H - PAD.top - PAD.bottom
    const maxV = Math.max(...points.map((p) => Math.max(p.value ?? 0, p.target)), 1)
    const yMax = niceMax(maxV * 1.08)
    const n = points.length
    const x = (i: number) => PAD.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w)
    const y = (v: number) => PAD.top + h - (v / yMax) * h
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

    // Value path with gaps where nothing was logged.
    let line = ''
    let area = ''
    let seg: number[] = []
    const flush = () => {
      if (!seg.length) return
      line += seg.map((i, j) => `${j ? 'L' : 'M'}${x(i)},${y(points[i].value!)}`).join('')
      area +=
        `M${x(seg[0])},${y(0)}` + seg.map((i) => `L${x(i)},${y(points[i].value!)}`).join('') + `L${x(seg[seg.length - 1])},${y(0)}Z`
      seg = []
    }
    points.forEach((p, i) => (p.value === undefined ? flush() : seg.push(i)))
    flush()

    // Stepped target line.
    let target = ''
    points.forEach((p, i) => {
      if (i === 0) target += `M${x(0)},${y(p.target)}`
      else {
        if (p.target !== points[i - 1].target) target += `L${x(i) - (x(i) - x(i - 1)) / 2},${y(points[i - 1].target)}L${x(i) - (x(i) - x(i - 1)) / 2},${y(p.target)}`
        target += `L${x(i)},${y(p.target)}`
      }
    })

    // X labels: first, middle, last.
    const xTicks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : points.map((_, i) => i)
    return { x, y, ticks, line, area, target, xTicks, w, h }
  }, [points, width])

  const lastIdx = (() => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i].value !== undefined) return i
    return -1
  })()

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const n = points.length
    const i = n <= 1 ? 0 : Math.round((px / r.width) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const hp = hover !== null ? points[hover] : null
  const lastTarget = points[points.length - 1]?.target

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={label} className="block overflow-visible font-sans">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-series)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--chart-series)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {geo.ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={PAD.left + geo.w}
                y1={geo.y(t)}
                y2={geo.y(t)}
                stroke={i === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-fg-3 text-[11px] tabular">
                {compact(t)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((i) => (
            <text
              key={i}
              x={geo.x(i)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-fg-3 text-[11px]"
            >
              {formatShort(points[i].key)}
            </text>
          ))}

          <path d={geo.area} fill={`url(#${gradId})`} />
          <path d={geo.target} fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinejoin="round" opacity={0.8} />
          {lastTarget !== undefined && (
            <text x={PAD.left + geo.w + 6} y={geo.y(lastTarget)} dy="0.32em" className="fill-fg-3 text-[11px] font-medium">
              Ziel
            </text>
          )}
          <path d={geo.line} fill="none" stroke="var(--chart-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Isolated single points (gap on both sides) would be invisible as a path. */}
          {points.map((p, i) =>
            p.value !== undefined && points[i - 1]?.value === undefined && points[i + 1]?.value === undefined ? (
              <circle key={p.key} cx={geo.x(i)} cy={geo.y(p.value)} r={3} fill="var(--chart-series)" />
            ) : null,
          )}

          {lastIdx >= 0 && hover === null && (
            <g>
              <circle cx={geo.x(lastIdx)} cy={geo.y(points[lastIdx].value!)} r={6} fill="var(--chart-surface)" />
              <circle cx={geo.x(lastIdx)} cy={geo.y(points[lastIdx].value!)} r={4} fill="var(--chart-series)" />
            </g>
          )}

          {hp && hover !== null && (
            <g pointerEvents="none">
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={PAD.top + geo.h} stroke="var(--chart-axis)" strokeWidth={1} />
              {hp.value !== undefined && (
                <>
                  <circle cx={geo.x(hover)} cy={geo.y(hp.value)} r={6} fill="var(--chart-surface)" />
                  <circle cx={geo.x(hover)} cy={geo.y(hp.value)} r={4} fill="var(--chart-series)" />
                </>
              )}
            </g>
          )}

          <rect
            x={PAD.left}
            y={0}
            width={geo.w}
            height={H}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            style={{ touchAction: 'pan-y' }}
          />
        </svg>
      )}

      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-xl border border-line-strong bg-bg-2/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur-xl"
          style={{
            left: Math.min(Math.max(geo.x(hover) - 72, 0), Math.max(width - 148, 0)),
          }}
        >
          <p className="font-medium text-fg-2">{formatShort(hp.key)}</p>
          <p className="mt-1 flex items-center gap-2 text-fg">
            <span className="inline-block size-2 rounded-full" style={{ background: 'var(--chart-series)' }} />
            <span className="font-display text-base font-semibold tabular">{hp.value !== undefined ? formatNumber(hp.value) : '–'}</span>
            <span className="text-fg-3">{unit}</span>
          </p>
          <p className="text-fg-3">
            Ziel {formatNumber(hp.target)} · {hp.value === undefined ? 'kein Eintrag' : hp.met ? 'geschafft' : 'verfehlt'}
          </p>
        </div>
      )}
    </div>
  )
}
