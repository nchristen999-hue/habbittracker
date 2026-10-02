import { Check, Circle, Minus, Moon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, formatFull, fromKey, todayKey, weekStart, type DateKey } from '@/lib/date'
import { activeGoals, dayStatus, isMet, targetOn, type DayStatus } from '@/lib/logic'
import type { DayEntry, Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useWidth } from './useWidth'

const CELL = 14
const GAP = 4
const LABEL_W = 20
const ROW_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'short' })

const STATUS_META: Record<Exclude<DayStatus, 'none'>, { label: string; cls: string; Icon: typeof Check }> = {
  perfect: { label: 'Alle Ziele', cls: 'bg-good', Icon: Check },
  partial: { label: 'Teilweise', cls: 'bg-warn', Icon: Minus },
  empty: { label: 'Nichts', cls: 'bg-[var(--heat-empty)]', Icon: Circle },
  rest: { label: 'Ruhetag', cls: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--text-3)]', Icon: Moon },
}

/** GitHub-style calendar of perfect / partial / empty days. Columns = weeks, rows = Mon–Sun. */
export function Heatmap({ goals, days }: { goals: Goal[]; days: Record<DateKey, DayEntry> }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<DateKey | null>(null)
  const today = todayKey()
  const weeks = Math.max(8, Math.min(26, Math.floor((width - LABEL_W) / (CELL + GAP))))
  const first = addDays(weekStart(today), -(weeks - 1) * 7)
  const daily = activeGoals(goals, 'daily')

  const grid = useMemo(() => {
    const cols: { key: DateKey; status: DayStatus | 'future' }[][] = []
    const counts = { perfect: 0, partial: 0, empty: 0, rest: 0 }
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const key = addDays(first, w * 7 + d)
        const status: DayStatus | 'future' = key > today ? 'future' : dayStatus(goals, days, key)
        if (status !== 'future' && status !== 'none' && key !== today) counts[status]++
        col.push({ key, status })
      }
      cols.push(col)
    }
    return { cols, counts }
  }, [weeks, first, today, goals, days])

  const activeInfo = active
    ? (() => {
        const relevant = daily.filter((g) => g.createdAt <= active)
        const met = relevant.filter((g) => isMet(g.kind, days[active]?.values[g.id], targetOn(g, active))).length
        return { met, total: relevant.length, status: dayStatus(goals, days, active) }
      })()
    : null

  return (
    <div>
      <div ref={ref} className="relative w-full" onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <div className="flex gap-1">
            <div className="flex flex-col pt-5" style={{ gap: GAP, width: LABEL_W - 4 }} aria-hidden>
              {ROW_LABELS.map((l, i) => (
                <span key={i} className="text-[10px] leading-[14px] text-fg-3" style={{ height: CELL }}>
                  {l}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }} role="grid" aria-label="Kalender der letzten Wochen">
              {grid.cols.map((col, w) => {
                const firstOfMonth = col.find((c) => fromKey(c.key).getDate() === 1)
                const showMonth = w === 0 || !!firstOfMonth
                return (
                  <div key={w} className="flex flex-col" style={{ gap: GAP }} role="row">
                    <span className="h-4 text-[10px] whitespace-nowrap text-fg-3" aria-hidden>
                      {showMonth ? monthFmt.format(fromKey(firstOfMonth?.key ?? col[0].key)) : ''}
                    </span>
                    {col.map((c) => {
                      const meta = c.status === 'future' || c.status === 'none' ? null : STATUS_META[c.status]
                      return (
                        <button
                          key={c.key}
                          type="button"
                          role="gridcell"
                          aria-label={`${formatFull(c.key)}: ${meta?.label ?? 'keine Daten'}`}
                          disabled={c.status === 'future'}
                          onPointerEnter={() => setActive(c.key)}
                          onFocus={() => setActive(c.key)}
                          onClick={() => setActive(c.key)}
                          className={cn(
                            'cursor-pointer rounded-[4px] transition-transform hover:scale-125 disabled:cursor-default disabled:hover:scale-100',
                            meta?.cls ?? 'bg-track opacity-40',
                            c.status === 'future' && 'opacity-0',
                            c.key === today && 'ring-1 ring-fg ring-offset-1 ring-offset-transparent',
                            c.key === active && 'ring-2 ring-accent',
                          )}
                          style={{ width: CELL, height: CELL }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 min-h-5 text-[13px] text-fg-2" aria-live="polite">
        {active && activeInfo ? (
          <>
            <span className="font-medium text-fg">{formatFull(active)}</span> ·{' '}
            {activeInfo.status === 'rest'
              ? 'Ruhetag'
              : activeInfo.total
                ? `${activeInfo.met} von ${activeInfo.total} Tageszielen`
                : 'Keine Ziele'}
          </>
        ) : (
          <span className="text-fg-3">Tippe auf einen Tag für Details.</span>
        )}
      </p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-fg-2">
        {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => {
          const { label, cls, Icon } = STATUS_META[k]
          return (
            <li key={k} className="inline-flex items-center gap-2">
              <span className={cn('grid size-3.5 place-items-center rounded-[4px]', cls)} aria-hidden />
              <Icon className="size-3.5 text-fg-3" aria-hidden />
              {label}
              <span className="font-semibold text-fg tabular">{grid.counts[k]}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
