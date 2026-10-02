import { addDays, diffDays, rangeKeys, weekDays, weekStart, type DateKey } from './date'
import type { AppData, DayEntry, Goal, GoalKind, GoalPeriod } from './types'

export type PeriodStatus = 'met' | 'missed' | 'skip' | 'pending'

// ---------- targets ----------

export function currentTarget(goal: Goal): number {
  return goal.targets[goal.targets.length - 1].target
}

/** Target that applied on a given day (first entry for days before any change). */
export function targetOn(goal: Goal, date: DateKey): number {
  let t = goal.targets[0].target
  for (const c of goal.targets) {
    if (c.from <= date) t = c.target
    else break
  }
  return t
}

/** A pending change that only kicks in after `date` (e.g. accepted overload starting tomorrow). */
export function upcomingTarget(goal: Goal, date: DateKey): { from: DateKey; target: number } | null {
  const next = goal.targets.find((c) => c.from > date)
  return next ? { from: next.from, target: next.target } : null
}

/** Replace any change on/after `from` and append the new one. */
export function withTarget(goal: Goal, from: DateKey, target: number): Goal {
  const kept = goal.targets.filter((c) => c.from < from)
  const prev = kept[kept.length - 1]
  if (prev && prev.target === target) return { ...goal, targets: kept }
  return { ...goal, targets: [...kept, { from, target }] }
}

// ---------- values ----------

export function isMet(kind: GoalKind, value: number | undefined, target: number): boolean {
  if (value === undefined) return false
  return kind === 'min' ? value >= target : value <= target
}

/** Progress 0..1 for a bar. For caps this is "how much of the budget is used". */
export function progress(value: number | undefined, target: number): number {
  if (!value || target <= 0) return value && value > 0 ? 1 : 0
  return Math.min(value / target, 1)
}

/** Key of the period (day or week start) containing `date`. */
export function periodKey(period: GoalPeriod, date: DateKey): DateKey {
  return period === 'daily' ? date : weekStart(date)
}

/** Logged value for the goal's period containing `date`. undefined = nothing logged. */
export function periodValue(goal: Goal, days: Record<DateKey, DayEntry>, date: DateKey): number | undefined {
  if (goal.period === 'daily') return days[date]?.values[goal.id]
  let sum: number | undefined
  for (const d of weekDays(weekStart(date))) {
    const v = days[d]?.values[goal.id]
    if (v !== undefined) sum = (sum ?? 0) + v
  }
  return sum
}

/** Target relevant for the period: daily = that day, weekly = target valid on the week's Monday. */
export function periodTarget(goal: Goal, date: DateKey): number {
  return targetOn(goal, periodKey(goal.period, date))
}

// ---------- periods & streaks ----------

export interface PeriodResult {
  key: DateKey
  value: number | undefined
  target: number
  status: PeriodStatus
}

/** All periods from the goal's creation up to (and including) the one containing `today`. */
export function evaluate(goal: Goal, data: Pick<AppData, 'days'>, today: DateKey): PeriodResult[] {
  const out: PeriodResult[] = []
  const step = goal.period === 'daily' ? 1 : 7
  const first = periodKey(goal.period, goal.createdAt)
  const last = periodKey(goal.period, today)
  for (let k = first; k <= last; k = addDays(k, step)) {
    const value = periodValue(goal, data.days, k)
    const target = targetOn(goal, k)
    const met = isMet(goal.kind, value, target)
    let status: PeriodStatus
    if (met) status = 'met'
    else if (goal.period === 'daily' && data.days[k]?.rest) status = 'skip'
    else if (k === last) status = 'pending'
    else status = 'missed'
    out.push({ key: k, value, target, status })
  }
  return out
}

/**
 * Current streak: walks back from the newest period. A still-open current period
 * and rest days neither count nor break the streak.
 */
export function currentStreak(results: PeriodResult[], since?: DateKey): number {
  let n = 0
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i]
    if (since && r.key < since) break
    if (r.status === 'met') n++
    else if (r.status === 'missed') break
  }
  return n
}

export function longestStreak(results: PeriodResult[]): number {
  let best = 0
  let run = 0
  for (const r of results) {
    if (r.status === 'met') best = Math.max(best, ++run)
    else if (r.status === 'missed') run = 0
  }
  return best
}

export interface GoalStats {
  results: PeriodResult[]
  current: number
  longest: number
  met: number
  evaluated: number
  rate: number | null
  /** Best logged period: highest for min goals, lowest for caps. */
  best: { key: DateKey; value: number } | null
  /** Streak counted only since the current target became active. */
  streakAtTarget: number
}

export function goalStats(goal: Goal, data: Pick<AppData, 'days'>, today: DateKey): GoalStats {
  const results = evaluate(goal, data, today)
  const done = results.filter((r) => r.status === 'met' || r.status === 'missed')
  const met = done.filter((r) => r.status === 'met').length
  let best: GoalStats['best'] = null
  for (const r of results) {
    if (r.value === undefined) continue
    if (goal.kind === 'max' && r.value <= 0 && r.status !== 'met') continue
    if (
      !best ||
      (goal.kind === 'min' ? r.value > best.value : r.value < best.value)
    ) {
      best = { key: r.key, value: r.value }
    }
  }
  const lastChange = goal.targets[goal.targets.length - 1].from
  return {
    results,
    current: currentStreak(results),
    longest: longestStreak(results),
    met,
    evaluated: done.length,
    rate: done.length ? met / done.length : null,
    best,
    streakAtTarget: currentStreak(results, periodKey(goal.period, lastChange)),
  }
}

// ---------- perfect days ----------

export type DayStatus = 'perfect' | 'partial' | 'empty' | 'rest' | 'none'

export function activeGoals(goals: Goal[], period?: GoalPeriod): Goal[] {
  return goals.filter((g) => !g.archived && (!period || g.period === period))
}

/** Day-level status across all daily goals that existed on that day. */
export function dayStatus(goals: Goal[], days: Record<DateKey, DayEntry>, date: DateKey): DayStatus {
  const relevant = activeGoals(goals, 'daily').filter((g) => g.createdAt <= date)
  if (!relevant.length) return 'none'
  if (days[date]?.rest) return 'rest'
  let met = 0
  for (const g of relevant) if (isMet(g.kind, days[date]?.values[g.id], targetOn(g, date))) met++
  if (met === relevant.length) return 'perfect'
  return met > 0 ? 'partial' : 'empty'
}

export interface PerfectStats {
  current: number
  longest: number
  total: number
  todayPerfect: boolean
}

export function perfectStats(goals: Goal[], days: Record<DateKey, DayEntry>, today: DateKey): PerfectStats {
  const daily = activeGoals(goals, 'daily')
  if (!daily.length) return { current: 0, longest: 0, total: 0, todayPerfect: false }
  const first = daily.reduce((m, g) => (g.createdAt < m ? g.createdAt : m), today)
  const statuses = rangeKeys(first, today).map((d) => ({ d, s: dayStatus(goals, days, d) }))
  let longest = 0
  let run = 0
  let total = 0
  for (const { s } of statuses) {
    if (s === 'perfect') {
      total++
      longest = Math.max(longest, ++run)
    } else if (s !== 'rest' && s !== 'none') run = 0
  }
  // Walk back from today; an unfinished today neither counts nor breaks the streak.
  let current = 0
  for (let i = statuses.length - 1; i >= 0; i--) {
    const s = statuses[i].s
    if (s === 'perfect') current++
    else if (s === 'rest' || s === 'none' || i === statuses.length - 1) continue
    else break
  }
  return {
    current,
    longest,
    total,
    todayPerfect: statuses[statuses.length - 1]?.s === 'perfect',
  }
}

// ---------- progressive overload ----------

/** Round to a "nice" number: 1, 2, 5 × 10^k. */
export function niceRound(n: number): number {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const base = 10 ** exp
  const f = n / base
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10
  return Math.max(1, nice * base)
}

/** Default overload step: ~10 % up for min goals, ~2 % down for caps. */
export function defaultStep(kind: GoalKind, target: number): number {
  return niceRound(target * (kind === 'min' ? 0.1 : 0.02))
}

export interface Suggestion {
  goal: Goal
  from: number
  to: number
  streak: number
  /** First day the new target would apply. */
  applyFrom: DateKey
}

export function nextTarget(goal: Goal): number | null {
  const t = currentTarget(goal)
  if (goal.kind === 'min') return t + goal.overload.step
  const next = t - goal.overload.step
  return next > 0 ? next : null
}

/**
 * When an accepted change should start. If the current period is already met,
 * the new target starts with the next period so today's win stays a win.
 */
export function changeStart(goal: Goal, days: Record<DateKey, DayEntry>, today: DateKey): DateKey {
  const met = isMet(goal.kind, periodValue(goal, days, today), periodTarget(goal, today))
  if (goal.period === 'daily') return met ? addDays(today, 1) : today
  const ws = weekStart(today)
  return met ? addDays(ws, 7) : ws
}

export function suggestions(data: AppData, today: DateKey): Suggestion[] {
  const out: Suggestion[] = []
  for (const goal of activeGoals(data.goals)) {
    if (!goal.overload.enabled || upcomingTarget(goal, today)) continue
    const snooze = data.snoozes[goal.id]
    if (snooze && snooze.until > today) continue
    const stats = goalStats(goal, data, today)
    if (stats.streakAtTarget < goal.overload.after) continue
    const to = nextTarget(goal)
    if (to === null) continue
    out.push({
      goal,
      from: currentTarget(goal),
      to,
      streak: stats.streakAtTarget,
      applyFrom: changeStart(goal, data.days, today),
    })
  }
  return out
}

// ---------- misc ----------

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)
}

export function periodLabel(period: GoalPeriod, n: number): string {
  if (period === 'daily') return n === 1 ? 'Tag' : 'Tage'
  return n === 1 ? 'Woche' : 'Wochen'
}

export function daysSince(from: DateKey, to: DateKey): number {
  return diffDays(to, from)
}
