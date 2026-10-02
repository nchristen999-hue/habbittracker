import { ArrowDownRight, ArrowUpRight, CalendarCheck, Flame, Sparkles, Table2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GoalIcon } from '@/components/GoalIcon'
import { Reveal } from '@/components/Reveal'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { addDays, formatFull, formatShort, todayKey } from '@/lib/date'
import { formatNumber, goalStats, perfectStats, periodLabel } from '@/lib/logic'
import type { Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/useUi'
import { Heatmap } from './Heatmap'
import { LineChart, type LinePoint } from './LineChart'

type Range = '30' | '90' | 'all'

export function StatsView() {
  const goals = useStore((s) => s.goals)
  const days = useStore((s) => s.days)
  const selectedId = useUi((s) => s.statsGoalId)
  const openStats = useUi((s) => s.openStats)
  const today = todayKey()
  const perfect = useMemo(() => perfectStats(goals, days, today), [goals, days, today])
  const visible = goals.filter((g) => !g.archived)
  const all = [...visible, ...goals.filter((g) => g.archived)]
  const selected = all.find((g) => g.id === selectedId) ?? visible[0] ?? all[0]

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1 pt-2">
        <h1 className="text-3xl font-semibold">
          Dein <span className="font-serif font-normal italic tracking-normal text-accent-gradient">Verlauf</span>
        </h1>
        <p className="mt-1 text-sm text-fg-3">Perfekter Tag = alle Tagesziele erfüllt.</p>
      </header>

      <Reveal>
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Flame className="text-warn" />} label="Aktuelle Serie" value={perfect.current} sub={periodLabel('daily', perfect.current)} />
          <Tile icon={<Trophy className="text-accent" />} label="Längste Serie" value={perfect.longest} sub={periodLabel('daily', perfect.longest)} />
          <Tile icon={<Sparkles className="text-good-fg" />} label="Perfekte Tage" value={perfect.total} sub="gesamt" />
        </div>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="mb-4">
            <div>
              <CardTitle>Kalender</CardTitle>
              <CardDescription>Grün: alle Ziele · Gelb: teilweise · Grau: nichts</CardDescription>
            </div>
            <CalendarCheck className="size-5 text-fg-3" aria-hidden />
          </CardHeader>
          <Heatmap goals={goals} days={days} />
        </Card>
      </Reveal>

      {all.length > 0 && selected && (
        <>
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="Ziel wählen">
            {all.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={g.id === selected.id}
                onClick={() => openStats(g.id)}
                className={cn(
                  'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors',
                  g.id === selected.id
                    ? 'border-transparent bg-accent-gradient text-white'
                    : 'border-line bg-glass text-fg-2 hover:text-fg',
                  g.archived && 'opacity-60',
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
          <GoalDetail key={selected.id} goal={selected} />
        </>
      )}
    </div>
  )
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="glass rounded-card p-4">
      <div className="flex items-center gap-1 text-[12px] leading-tight text-fg-3 [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl leading-none font-semibold">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-fg-3">{sub}</p>}
    </div>
  )
}

function GoalDetail({ goal }: { goal: Goal }) {
  const days = useStore((s) => s.days)
  const today = todayKey()
  const [range, setRange] = useState<Range>('30')
  const [table, setTable] = useState(false)
  const stats = useMemo(() => goalStats(goal, { days }, today), [goal, days, today])
  const unitLabel = (n: number) => periodLabel(goal.period, n)
  const weekly = goal.period === 'weekly'

  const points: LinePoint[] = useMemo(() => {
    const res = stats.results
    let from = res[0]?.key
    if (range !== 'all') {
      // Daily: 30/90 days. Weekly: 12/26 weeks.
      const span = weekly ? (range === '30' ? 12 : 26) * 7 : Number(range)
      const cutoff = addDays(today, -(span - 1))
      from = res.find((r) => r.key >= (weekly ? addDays(cutoff, -6) : cutoff))?.key ?? from
    }
    return res
      .filter((r) => r.key >= from)
      .map((r) => ({ key: r.key, value: r.value, target: r.target, met: r.status === 'met' }))
  }, [stats, range, today, weekly])

  const history = goal.targets

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <div className="flex items-center gap-3 px-1">
          <GoalIcon name={goal.icon} />
          <div>
            <h2 className="text-xl font-semibold">{goal.name}</h2>
            <p className="text-[13px] text-fg-3">
              {goal.kind === 'min' ? 'Mindestens' : 'Höchstens'} {formatNumber(goal.targets[goal.targets.length - 1].target)} {goal.unit}{' '}
              {weekly ? 'pro Woche' : 'pro Tag'}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 gap-2">
          <div className="glass col-span-2 rounded-card p-4">
            <p className="text-[12px] text-fg-3">Erfolgsquote</p>
            <div className="mt-2 flex items-baseline justify-between gap-4">
              <p className="font-display text-4xl leading-none font-semibold">
                {stats.rate === null ? '–' : `${Math.round(stats.rate * 100)} %`}
              </p>
              <p className="text-right text-sm text-fg-2">
                <span className="font-semibold text-fg">{stats.met}</span> von {stats.evaluated} {unitLabel(stats.evaluated)} geschafft
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-track" aria-hidden>
              <div className="h-full rounded-full bg-accent-gradient" style={{ width: `${(stats.rate ?? 0) * 100}%` }} />
            </div>
          </div>
          <Tile icon={<Flame className="text-warn" />} label="Aktuelle Serie" value={stats.current} sub={unitLabel(stats.current)} />
          <Tile icon={<Trophy className="text-accent" />} label="Längste Serie" value={stats.longest} sub={unitLabel(stats.longest)} />
          <div className="glass col-span-2 flex items-center justify-between gap-4 rounded-card p-4">
            <div>
              <p className="text-[12px] text-fg-3">
                Persönlicher Rekord {goal.kind === 'max' ? '(niedrigster Wert)' : ''}
                {weekly ? ' · beste Woche' : ' · bester Tag'}
              </p>
              <p className="mt-2 font-display text-2xl leading-none font-semibold">
                {stats.best ? `${formatNumber(stats.best.value)} ${goal.unit}` : '–'}
              </p>
            </div>
            {stats.best && <p className="text-sm text-fg-3">{formatFull(stats.best.key)}</p>}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="flex-wrap">
            <div>
              <CardTitle>Verlauf</CardTitle>
              <CardDescription>
                {weekly ? 'Wochensumme' : 'Eingetragener Wert'} in {goal.unit || 'Einheiten'} · Linie grau = Ziel
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                ariaLabel="Zeitraum"
                value={range}
                onChange={setRange}
                options={[
                  { value: '30', label: weekly ? '12 W' : '30 T' },
                  { value: '90', label: weekly ? '26 W' : '90 T' },
                  { value: 'all', label: 'Alle' },
                ]}
              />
              <button
                type="button"
                onClick={() => setTable((t) => !t)}
                aria-pressed={table}
                aria-label="Als Tabelle anzeigen"
                className={cn(
                  'grid size-11 cursor-pointer place-items-center rounded-xl border border-line text-fg-3 hover:text-fg',
                  table && 'bg-glass-hover text-fg',
                )}
              >
                <Table2 className="size-4" />
              </button>
            </div>
          </CardHeader>
          {table ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm tabular">
                <thead className="sticky top-0 bg-bg-2 text-left text-[12px] text-fg-3">
                  <tr>
                    <th className="py-2 font-medium">{weekly ? 'Woche ab' : 'Datum'}</th>
                    <th className="py-2 text-right font-medium">Wert</th>
                    <th className="py-2 text-right font-medium">Ziel</th>
                    <th className="py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p) => (
                    <tr key={p.key} className="border-t border-line">
                      <td className="py-2 text-fg-2">{formatShort(p.key)}</td>
                      <td className="py-2 text-right">{p.value !== undefined ? formatNumber(p.value) : '–'}</td>
                      <td className="py-2 text-right text-fg-3">{formatNumber(p.target)}</td>
                      <td className={cn('py-2 text-right', p.met ? 'text-good-fg' : 'text-fg-3')}>{p.met ? '✓' : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <LineChart points={points} unit={goal.unit} label={`Verlauf ${goal.name}`} />
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ziel-Historie</CardTitle>
              <CardDescription>So hat sich dein Ziel entwickelt.</CardDescription>
            </div>
          </CardHeader>
          <ol className="relative ml-2 border-l border-line">
            {[...history].reverse().map((c, i, arr) => {
              const prev = arr[i + 1]
              const delta = prev ? c.target - prev.target : 0
              const future = c.from > today
              return (
                <li key={c.from} className="relative pb-4 pl-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute top-1.5 -left-[5px] size-2.5 rounded-full',
                      i === 0 ? 'bg-accent-gradient' : 'bg-fg-3',
                    )}
                    aria-hidden
                  />
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-display text-lg font-semibold">
                      {formatNumber(c.target)} <span className="text-sm font-normal text-fg-3">{goal.unit}</span>
                    </p>
                    {prev && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[13px] font-medium',
                          (goal.kind === 'min' ? delta > 0 : delta < 0) ? 'text-good-fg' : 'text-fg-3',
                        )}
                      >
                        {delta > 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
                        {delta > 0 ? '+' : ''}
                        {formatNumber(delta)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-fg-3">
                    {future ? 'ab ' : prev ? 'seit ' : 'Start '}
                    {formatFull(c.from)}
                  </p>
                </li>
              )
            })}
          </ol>
        </Card>
      </Reveal>
    </div>
  )
}
