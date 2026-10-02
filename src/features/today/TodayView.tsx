import { ChevronLeft, ChevronRight, Flame, Moon, NotebookPen, Plus, Sparkles, Trophy } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { HeroBeam } from '@/components/HeroBeam'
import { ProgressRing } from '@/components/ProgressRing'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { addDays, formatLong, relativeLabel, todayKey, type DateKey } from '@/lib/date'
import {
  activeGoals,
  formatNumber,
  goalStats,
  isMet,
  perfectStats,
  periodTarget,
  periodValue,
  suggestions,
} from '@/lib/logic'
import type { Goal } from '@/lib/types'
import { selectData, useStore } from '@/store/useStore'
import { useUi } from '@/store/useUi'
import { GoalCard } from './GoalCard'
import { SuggestionCard } from './SuggestionCard'

export function TodayView() {
  const state = useStore()
  const date = useUi((s) => s.date)
  const setDate = useUi((s) => s.setDate)
  const editGoal = useUi((s) => s.editGoal)
  const today = todayKey()

  const daily = activeGoals(state.goals, 'daily')
  const weekly = activeGoals(state.goals, 'weekly')
  const streaks = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of activeGoals(state.goals)) m[g.id] = goalStats(g, state, today).current
    return m
  }, [state, today])
  const sugg = useMemo(
    () => (date === today ? suggestions(selectData(state), today) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.goals, state.days, state.snoozes, date, today],
  )
  const perfect = useMemo(() => perfectStats(state.goals, state.days, today), [state.goals, state.days, today])

  if (!state.goals.filter((g) => !g.archived).length) return <EmptyState />

  return (
    <div className="flex flex-col gap-4">
      <Hero date={date} daily={daily} perfect={perfect} />

      <AnimatePresence initial={false}>
        {sugg.map((s) => (
          <SuggestionCard key={s.goal.id} s={s} />
        ))}
      </AnimatePresence>

      {daily.length > 0 && (
        <section aria-labelledby="daily-h" className="flex flex-col gap-3">
          <SectionTitle id="daily-h">Tagesziele</SectionTitle>
          {daily.map((g, i) => (
            <Reveal key={g.id} delay={Math.min(i * 0.04, 0.2)}>
              <GoalCard goal={g} date={date} streak={streaks[g.id] ?? 0} />
            </Reveal>
          ))}
        </section>
      )}

      {weekly.length > 0 && (
        <section aria-labelledby="weekly-h" className="flex flex-col gap-3">
          <SectionTitle id="weekly-h">Wochenziele</SectionTitle>
          {weekly.map((g) => (
            <Reveal key={g.id}>
              <GoalCard goal={g} date={date} streak={streaks[g.id] ?? 0} />
            </Reveal>
          ))}
        </section>
      )}

      <Reveal>
        <DayFooter key={date} date={date} />
      </Reveal>

      <Button variant="ghost" className="self-center" onClick={() => editGoal('new')}>
        <Plus /> Ziel hinzufügen
      </Button>

      {date !== today && (
        <Button variant="outline" size="sm" className="self-center" onClick={() => setDate(today)}>
          Zurück zu heute
        </Button>
      )}
    </div>
  )
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-4 px-1 text-[13px] font-semibold tracking-[0.12em] text-fg-3 uppercase">
      {children}
    </h2>
  )
}

function Hero({ date, daily, perfect }: { date: DateKey; daily: Goal[]; perfect: ReturnType<typeof perfectStats> }) {
  const days = useStore((s) => s.days)
  const setDate = useUi((s) => s.setDate)
  const today = todayKey()
  const rest = !!days[date]?.rest
  const metGoals = daily.filter((g) => isMet(g.kind, periodValue(g, days, date), periodTarget(g, date)))
  const n = daily.length
  const m = metGoals.length
  const allDone = n > 0 && m === n

  // One concrete next step instead of generic motivation.
  const next = (() => {
    if (rest) return 'Streaks pausieren heute. Morgen geht’s weiter.'
    if (!n) return 'Lege ein Tagesziel an, um Serien zu sammeln.'
    if (allDone) return perfect.current > 1 ? `${perfect.current} perfekte Tage in Folge.` : 'Alles erledigt. Morgen wieder.'
    const open = daily.find((g) => !metGoals.includes(g) && g.kind === 'min')
    if (open) {
      const left = periodTarget(open, date) - (periodValue(open, days, date) ?? 0)
      return `Nächster Schritt: noch ${formatNumber(left)} ${open.unit} ${open.name}.`
    }
    const cap = daily.find((g) => !metGoals.includes(g))
    return cap ? `${cap.name} noch eintragen, dann ist der Tag komplett.` : ''
  })()

  return (
    <section className="glass relative overflow-hidden rounded-[1.75rem] p-6">
      <HeroBeam />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Vorheriger Tag" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft />
          </Button>
          <p className="text-[13px] font-medium text-fg-2" aria-live="polite">
            {date === today ? formatLong(date) : relativeLabel(date, today)}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Nächster Tag"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {rest ? (
              <h1 className="text-4xl font-semibold leading-none">
                Ruhetag<span className="text-accent-gradient">.</span>
              </h1>
            ) : allDone ? (
              <h1 className="text-4xl font-semibold leading-none">
                Perfekter <span className="font-serif text-[1.15em] font-normal italic tracking-normal text-accent-gradient">Tag.</span>
              </h1>
            ) : (
              <h1 className="text-4xl leading-none font-semibold">
                {m} von {n}
                <span className="mt-1 block font-serif text-[0.8em] font-normal italic tracking-normal text-fg-2">
                  Zielen erfüllt
                </span>
              </h1>
            )}
            <p className="mt-4 text-sm text-fg-2">{next}</p>
          </div>
          <ProgressRing value={n ? m / n : 0}>
            {allDone ? (
              <Sparkles className="size-6 text-accent" aria-hidden />
            ) : rest ? (
              <Moon className="size-6 text-accent" aria-hidden />
            ) : (
              <span className="font-display text-lg font-semibold tabular">{n ? Math.round((m / n) * 100) : 0}%</span>
            )}
          </ProgressRing>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-line bg-glass px-4 py-3">
            <dt className="flex items-center gap-1 text-[12px] text-fg-3">
              <Flame className="size-3.5 text-warn" aria-hidden /> Perfekte Serie
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold">{perfect.current}</dd>
          </div>
          <div className="rounded-2xl border border-line bg-glass px-4 py-3">
            <dt className="flex items-center gap-1 text-[12px] text-fg-3">
              <Trophy className="size-3.5 text-accent" aria-hidden /> Rekord
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              {perfect.longest} <span className="text-sm font-normal text-fg-3">Tage</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function DayFooter({ date }: { date: DateKey }) {
  const day = useStore((s) => s.days[date])
  const toggleRest = useStore((s) => s.toggleRest)
  const setNote = useStore((s) => s.setNote)
  const [note, setLocal] = useState(day?.note ?? '')

  // Save shortly after typing stops.
  useEffect(() => {
    if (note === (day?.note ?? '')) return
    const t = setTimeout(() => setNote(date, note.trim()), 500)
    return () => clearTimeout(t)
  }, [note, date, day?.note, setNote])

  return (
    <div className="glass mt-4 flex flex-col gap-4 rounded-card p-4">
      <label className="flex cursor-pointer items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-glass text-fg-2">
          <Moon className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Ruhetag</span>
          <span className="block text-[13px] text-fg-3">Streaks pausieren, statt zu brechen.</span>
        </span>
        <Switch checked={!!day?.rest} onCheckedChange={() => toggleRest(date)} aria-label="Ruhetag" />
      </label>
      <div>
        <label htmlFor="day-note" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4 text-fg-3" aria-hidden /> Notiz
        </label>
        <Textarea
          id="day-note"
          placeholder="Was lief gut, was nicht?"
          value={note}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => note !== (day?.note ?? '') && setNote(date, note.trim())}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  const editGoal = useUi((s) => s.editGoal)
  const loadDemo = useStore((s) => s.loadDemo)
  return (
    <section className="glass relative overflow-hidden rounded-[1.75rem] px-6 py-12 text-center">
      <HeroBeam />
      <div className="relative">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">Overload</p>
        <h1 className="mt-4 text-4xl leading-tight font-semibold">
          Jeden Tag ein Stück <span className="font-serif font-normal italic tracking-normal text-accent-gradient">mehr.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-fg-2">
          Setz dir ein Tagesziel. Schaffst du es eine Woche lang, schlägt Overload den nächsten Schritt vor.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" size="lg" onClick={() => editGoal('new')}>
            <Plus /> Erstes Ziel anlegen
          </Button>
          <Button variant="ghost" size="lg" onClick={loadDemo}>
            Mit Beispieldaten testen
          </Button>
        </div>
      </div>
    </section>
  )
}
