import { describe, expect, it } from 'vitest'
import { addDays } from './date'
import {
  changeStart,
  currentStreak,
  dayStatus,
  defaultStep,
  evaluate,
  goalStats,
  niceRound,
  perfectStats,
  suggestions,
  targetOn,
  withTarget,
} from './logic'
import { emptyData, parseData } from './storage'
import type { AppData, Goal } from './types'
import { demoData } from '@/store/demo'

const TODAY = '2026-10-02' // a Friday

function goal(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g',
    name: 'Liegestütze',
    icon: 'Dumbbell',
    unit: 'Wdh.',
    kind: 'min',
    period: 'daily',
    targets: [{ from: addDays(TODAY, -20), target: 100 }],
    quickAdds: [10],
    overload: { enabled: true, after: 7, step: 10 },
    createdAt: addDays(TODAY, -20),
    archived: false,
    ...partial,
  }
}

function withDays(entries: Record<number, number | 'rest'>, id = 'g'): AppData {
  const data = emptyData()
  for (const [offset, v] of Object.entries(entries)) {
    const k = addDays(TODAY, Number(offset))
    data.days[k] = v === 'rest' ? { values: {}, rest: true } : { values: { [id]: v } }
  }
  return data
}

describe('targets', () => {
  it('resolves the target valid on a date', () => {
    const g = withTarget(goal(), addDays(TODAY, -5), 110)
    expect(targetOn(g, addDays(TODAY, -6))).toBe(100)
    expect(targetOn(g, addDays(TODAY, -5))).toBe(110)
    expect(targetOn(g, TODAY)).toBe(110)
  })

  it('niceRound and defaultStep pick human numbers', () => {
    expect(niceRound(46)).toBe(50)
    expect(defaultStep('min', 100)).toBe(10)
    expect(defaultStep('max', 2300)).toBe(50)
  })
})

describe('streaks', () => {
  it('counts consecutive days, today pending does not break', () => {
    const data = withDays({ [-3]: 100, [-2]: 120, [-1]: 105, 0: 40 })
    const s = goalStats(goal(), data, TODAY)
    expect(s.current).toBe(3)
  })

  it('rest days neither count nor break', () => {
    const data = withDays({ [-4]: 100, [-3]: 100, [-2]: 'rest', [-1]: 100 })
    expect(goalStats(goal(), data, TODAY).current).toBe(3)
  })

  it('a miss breaks the streak and longest is tracked', () => {
    const data = withDays({ [-8]: 100, [-7]: 100, [-6]: 100, [-5]: 10, [-1]: 100 })
    const s = goalStats(goal(), data, TODAY)
    expect(s.current).toBe(1)
    expect(s.longest).toBe(3)
  })

  it('caps are met when logged and <= target, unlogged days are misses', () => {
    const g = goal({ kind: 'max', targets: [{ from: addDays(TODAY, -20), target: 2300 }] })
    const data = withDays({ [-3]: 2200, [-2]: 2400, [-1]: 2300 })
    const r = evaluate(g, data, TODAY)
    expect(r.at(-2)?.status).toBe('met')
    expect(r.at(-3)?.status).toBe('missed')
    expect(r.at(-1)?.status).toBe('pending')
    expect(currentStreak(r)).toBe(1)
  })

  it('weekly goals sum the week', () => {
    const g = goal({ period: 'weekly', targets: [{ from: '2026-09-14', target: 3 }], createdAt: '2026-09-14' })
    const data = emptyData()
    for (const k of ['2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22', '2026-09-24', '2026-09-26']) {
      data.days[k] = { values: { g: 1 } }
    }
    const s = goalStats(g, data, TODAY)
    expect(s.results.map((r) => r.status)).toEqual(['met', 'met', 'pending'])
    expect(s.current).toBe(2)
  })
})

describe('progressive overload', () => {
  it('suggests after N days at the current target', () => {
    const entries: Record<number, number> = {}
    for (let i = -7; i <= -1; i++) entries[i] = 100
    const data = { ...withDays(entries), goals: [goal()] }
    const [s] = suggestions(data, TODAY)
    expect(s).toMatchObject({ from: 100, to: 110, streak: 7, applyFrom: TODAY })
  })

  it('only counts days since the last target change', () => {
    const entries: Record<number, number> = {}
    for (let i = -7; i <= -1; i++) entries[i] = 120
    const g = withTarget(goal(), addDays(TODAY, -3), 110)
    const data = { ...withDays(entries), goals: [g] }
    expect(suggestions(data, TODAY)).toHaveLength(0)
  })

  it('caps step down and respect snoozes', () => {
    const entries: Record<number, number> = {}
    for (let i = -7; i <= -1; i++) entries[i] = 2000
    const g = goal({ kind: 'max', targets: [{ from: addDays(TODAY, -20), target: 2300 }], overload: { enabled: true, after: 7, step: 50 } })
    const data = { ...withDays(entries), goals: [g] }
    expect(suggestions(data, TODAY)[0]).toMatchObject({ to: 2250 })
    data.snoozes = { g: { until: addDays(TODAY, 2) } }
    expect(suggestions(data, TODAY)).toHaveLength(0)
  })

  it('a change starts tomorrow when today is already met', () => {
    const data = withDays({ 0: 100 })
    expect(changeStart(goal(), data.days, TODAY)).toBe(addDays(TODAY, 1))
    expect(changeStart(goal(), withDays({ 0: 50 }).days, TODAY)).toBe(TODAY)
  })
})

describe('perfect days', () => {
  it('classifies days and counts the streak', () => {
    const a = goal({ id: 'a' })
    const b = goal({ id: 'b', kind: 'max', targets: [{ from: addDays(TODAY, -20), target: 5 }] })
    const data = emptyData()
    data.goals = [a, b]
    data.days[addDays(TODAY, -3)] = { values: { a: 100, b: 2 } }
    data.days[addDays(TODAY, -2)] = { values: {}, rest: true }
    data.days[addDays(TODAY, -1)] = { values: { a: 120, b: 5 } }
    data.days[TODAY] = { values: { a: 120 } }
    expect(dayStatus(data.goals, data.days, TODAY)).toBe('partial')
    expect(dayStatus(data.goals, data.days, addDays(TODAY, -2))).toBe('rest')
    const p = perfectStats(data.goals, data.days, TODAY)
    expect(p.current).toBe(2)
    expect(p.total).toBe(2)
  })
})

describe('storage', () => {
  it('round-trips demo data and rejects garbage', () => {
    const demo = demoData(TODAY)
    const parsed = parseData(JSON.parse(JSON.stringify(demo)))
    expect(parsed.goals).toHaveLength(demo.goals.length)
    expect(Object.keys(parsed.days)).toHaveLength(Object.keys(demo.days).length)
    expect(() => parseData({ foo: 1 })).toThrow()
  })

  it('demo data produces an overload suggestion for push-ups', () => {
    const s = suggestions(demoData(TODAY), TODAY)
    expect(s.map((x) => x.goal.id)).toContain('demo-pushups')
  })
})
