import { BarChart3, Check, Flame, Minus, Plus, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { GoalIcon } from '@/components/GoalIcon'
import { Button } from '@/components/ui/button'
import { celebrate } from '@/lib/celebrate'
import { weekDays, weekStart, type DateKey } from '@/lib/date'
import { formatNumber, isMet, periodTarget, periodValue, progress } from '@/lib/logic'
import type { Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/useUi'

const WEEKDAY = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

export function GoalCard({ goal, date, streak }: { goal: Goal; date: DateKey; streak: number }) {
  const days = useStore((s) => s.days)
  const confettiOn = useStore((s) => s.settings.confetti)
  const setValue = useStore((s) => s.setValue)
  const addValue = useStore((s) => s.addValue)
  const openStats = useUi((s) => s.openStats)
  const cardRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [pop, setPop] = useState(false)

  const target = periodTarget(goal, date)
  const total = periodValue(goal, days, date)
  const dayValue = days[date]?.values[goal.id]
  const met = isMet(goal.kind, total, target)
  const over = goal.kind === 'max' && total !== undefined && total > target
  const pct = progress(total, target)
  const isWeekly = goal.period === 'weekly'

  const fire = (events: ReturnType<typeof setValue>) => {
    if (events.length) {
      setPop(true)
      setTimeout(() => setPop(false), 400)
    }
    celebrate(events, { confetti: confettiOn, from: cardRef.current })
  }

  const step = goal.quickAdds[0] ?? 1
  const canMinus = (dayValue ?? 0) > 0

  const status = (() => {
    if (goal.kind === 'min') {
      if (met) return { text: 'Geschafft', tone: 'good' as const }
      const left = target - (total ?? 0)
      return { text: `Noch ${formatNumber(left)} ${goal.unit}`.trim(), tone: 'muted' as const }
    }
    if (total === undefined) return { text: 'Noch nichts eingetragen', tone: 'muted' as const }
    if (over) return { text: `${formatNumber(total - target)} ${goal.unit} drüber`.trim(), tone: 'danger' as const }
    return { text: `${formatNumber(target - total)} ${goal.unit} frei`.trim(), tone: 'good' as const }
  })()

  return (
    <div ref={cardRef} className={cn('glass relative rounded-card p-4 transition-colors', met && 'border-good/30')}>
      <div className="flex items-center gap-3">
        <GoalIcon name={goal.icon} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{goal.name}</h3>
          <p className="text-[13px] text-fg-3">
            {goal.kind === 'min' ? 'Mindestens' : 'Höchstens'} {formatNumber(target)} {goal.unit}
            {isWeekly ? ' pro Woche' : ''}
          </p>
        </div>
        {streak > 0 && (
          <span
            className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-glass px-3 text-[13px] font-semibold tabular"
            title={`${streak} ${isWeekly ? 'Wochen' : 'Tage'} in Folge`}
          >
            <Flame className="size-4 text-warn" aria-hidden />
            {streak}
            <span className="sr-only">{isWeekly ? 'Wochen' : 'Tage'} in Folge</span>
          </span>
        )}
        {goal.kind === 'min' && (
          <button
            type="button"
            aria-label={met ? `${goal.name} erfüllt` : `${goal.name} abhaken`}
            aria-pressed={met}
            onClick={() => !met && fire(setValue(date, goal.id, (dayValue ?? 0) + (target - (total ?? 0))))}
            className={cn(
              'grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border transition-all',
              met
                ? 'border-transparent bg-accent-gradient text-white shadow-[0_6px_20px_-6px_rgb(91_60_235/0.8)]'
                : 'border-line-strong text-fg-3 hover:border-accent hover:text-accent',
              pop && 'animate-pop',
            )}
          >
            <Check className="size-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        {editing ? (
          <ValueEditor
            initial={dayValue}
            unit={goal.unit}
            onDone={(v) => {
              setEditing(false)
              if (v !== dayValue) fire(setValue(date, goal.id, v))
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-mx-2 -my-1 cursor-text rounded-lg px-2 py-1 text-left hover:bg-glass-strong"
            aria-label={`Wert für ${goal.name} eingeben`}
          >
            <span className="font-display text-3xl font-semibold tracking-tight">{formatNumber(total ?? 0)}</span>
            <span className="ml-1 text-sm text-fg-3">
              / {formatNumber(target)} {goal.unit}
            </span>
          </button>
        )}
        {goal.kind === 'max' && total === undefined ? (
          <button
            type="button"
            onClick={() => fire(setValue(date, goal.id, 0))}
            className="cursor-pointer pb-1 text-[13px] font-medium text-accent underline-offset-4 hover:underline"
          >
            Nichts? 0 eintragen
          </button>
        ) : (
        <span
          className={cn(
            'inline-flex items-center gap-1 pb-1 text-[13px] font-medium',
            status.tone === 'good' && 'text-good-fg',
            status.tone === 'danger' && 'text-danger',
            status.tone === 'muted' && 'text-fg-3',
          )}
        >
          {status.tone === 'good' && <Check className="size-4" aria-hidden />}
          {status.tone === 'danger' && <TriangleAlert className="size-4" aria-hidden />}
          {status.text}
        </span>
        )}
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={total ?? 0}
        aria-label={`${goal.name} Fortschritt`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', over ? 'bg-danger' : 'bg-accent-gradient')}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {isWeekly && <WeekStrip goal={goal} date={date} />}

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="icon"
          variant="glass"
          aria-label={`${formatNumber(step)} abziehen`}
          disabled={!canMinus}
          onClick={() => setValue(date, goal.id, Math.max(0, (dayValue ?? 0) - step) || undefined)}
        >
          <Minus />
        </Button>
        <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
          {goal.quickAdds.map((q) => (
            <Button key={q} variant="glass" className="min-w-16 flex-1 tabular" onClick={() => fire(addValue(date, goal.id, q))}>
              <Plus className="-mr-1 size-3.5!" aria-hidden />
              {formatNumber(q)}
            </Button>
          ))}
        </div>
        <Button size="icon" variant="ghost" aria-label={`Statistik für ${goal.name}`} onClick={() => openStats(goal.id)}>
          <BarChart3 />
        </Button>
      </div>
    </div>
  )
}

function ValueEditor({ initial, unit, onDone }: { initial: number | undefined; unit: string; onDone: (v: number | undefined) => void }) {
  const [text, setText] = useState(initial !== undefined ? String(initial) : '')
  const commit = () => {
    const n = parseFloat(text.replace(',', '.'))
    onDone(text.trim() === '' || Number.isNaN(n) ? undefined : n)
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        commit()
      }}
    >
      <input
        autoFocus
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Escape' && onDone(initial)}
        className="h-11 w-32 rounded-xl border border-accent bg-glass-strong px-3 font-display text-2xl font-semibold text-fg outline-none"
        aria-label="Wert"
      />
      <span className="text-sm text-fg-3">{unit}</span>
    </form>
  )
}

function WeekStrip({ goal, date }: { goal: Goal; date: DateKey }) {
  const days = useStore((s) => s.days)
  return (
    <div className="mt-3 grid grid-cols-7 gap-1" aria-label="Einträge diese Woche">
      {weekDays(weekStart(date)).map((d, i) => {
        const v = days[d]?.values[goal.id]
        const has = v !== undefined && v > 0
        return (
          <div key={d} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'grid size-7 place-items-center rounded-lg text-[11px] font-semibold tabular',
                has ? 'bg-accent-gradient text-white' : 'bg-track text-fg-3',
                d === date && 'ring-2 ring-accent ring-offset-2 ring-offset-transparent',
              )}
              title={has ? `${formatNumber(v)} ${goal.unit}` : 'Kein Eintrag'}
            >
              {has ? formatNumber(v) : ''}
            </span>
            <span className="text-[11px] text-fg-3">{WEEKDAY[i]}</span>
          </div>
        )
      })}
    </div>
  )
}
