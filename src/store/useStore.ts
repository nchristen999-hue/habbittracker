import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { addDays, todayKey, weekStart, type DateKey } from '@/lib/date'
import {
  changeStart,
  currentTarget,
  dayStatus,
  defaultStep,
  goalStats,
  isMet,
  nextTarget,
  periodTarget,
  periodValue,
  perfectStats,
  withTarget,
} from '@/lib/logic'
import { emptyData, parseData, STORAGE_KEY } from '@/lib/storage'
import { MILESTONES, type AppData, type Goal, type GoalKind, type GoalPeriod } from '@/lib/types'
import { demoData } from './demo'

export type Celebration =
  | { type: 'met'; goal: Goal }
  | { type: 'milestone'; goal: Goal; days: number }
  | { type: 'perfect'; streak: number; milestone: number | null }

export interface GoalInput {
  name: string
  icon: string
  unit: string
  kind: GoalKind
  period: GoalPeriod
  target: number
  quickAdds: number[]
  overload: Goal['overload']
}

interface Actions {
  addGoal: (input: GoalInput) => void
  updateGoal: (id: string, input: GoalInput) => void
  archiveGoal: (id: string, archived: boolean) => void
  deleteGoal: (id: string) => void
  reorderGoals: (ids: string[]) => void
  /** Set (or clear with undefined) the logged value. Returns things worth celebrating. */
  setValue: (date: DateKey, goalId: string, value: number | undefined) => Celebration[]
  addValue: (date: DateKey, goalId: string, delta: number) => Celebration[]
  toggleRest: (date: DateKey) => void
  setNote: (date: DateKey, note: string) => void
  acceptSuggestion: (goalId: string) => void
  snoozeSuggestion: (goalId: string, days?: number) => void
  setTheme: (theme: AppData['settings']['theme']) => void
  setConfetti: (on: boolean) => void
  importData: (raw: unknown) => void
  loadDemo: () => void
  reset: () => void
}

export type Store = AppData & Actions

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const round = (n: number) => Math.round(n * 100) / 100

export function newGoal(input: GoalInput, today: DateKey = todayKey()): Goal {
  return {
    id: uid(),
    name: input.name.trim(),
    icon: input.icon,
    unit: input.unit.trim(),
    kind: input.kind,
    period: input.period,
    targets: [{ from: input.period === 'weekly' ? weekStart(today) : today, target: input.target }],
    quickAdds: input.quickAdds,
    overload: {
      ...input.overload,
      step: input.overload.step || defaultStep(input.kind, input.target),
    },
    createdAt: today,
    archived: false,
  }
}

/** Compare state before/after a value change and collect what deserves a moment. */
function celebrationsFor(before: AppData, after: AppData, goalId: string, date: DateKey): Celebration[] {
  const today = todayKey()
  const goal = after.goals.find((g) => g.id === goalId)
  if (!goal) return []
  const out: Celebration[] = []
  const t = periodTarget(goal, date)
  const was = isMet(goal.kind, periodValue(goal, before.days, date), t)
  const now = isMet(goal.kind, periodValue(goal, after.days, date), t)
  // Caps are "met" as soon as anything is logged — only celebrate climbs.
  if (!was && now && goal.kind === 'min') out.push({ type: 'met', goal })

  if (!was && now && date === today) {
    const streak = goalStats(goal, after, today).current
    if ((MILESTONES as readonly number[]).includes(streak) && goal.period === 'daily') {
      out.push({ type: 'milestone', goal, days: streak })
    }
  }
  if (goal.period === 'daily' && date === today) {
    const prevDay = dayStatus(before.goals, before.days, date)
    const nextDay = dayStatus(after.goals, after.days, date)
    if (prevDay !== 'perfect' && nextDay === 'perfect') {
      const streak = perfectStats(after.goals, after.days, today).current
      const milestone = (MILESTONES as readonly number[]).includes(streak) ? streak : null
      out.push({ type: 'perfect', streak, milestone })
    }
  }
  return out
}

const pickData = (s: Store): AppData => ({
  version: 1,
  goals: s.goals,
  days: s.days,
  snoozes: s.snoozes,
  celebrated: s.celebrated,
  settings: s.settings,
})

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const setValue = (date: DateKey, goalId: string, value: number | undefined): Celebration[] => {
        const before = pickData(get())
        const day = before.days[date] ?? { values: {} }
        const values = { ...day.values }
        if (value === undefined || Number.isNaN(value)) delete values[goalId]
        else values[goalId] = Math.max(0, round(value))
        const days = { ...before.days, [date]: { ...day, values } }
        // Logging in the past before a goal existed moves its start back.
        const goals = before.goals.map((g) => (g.id === goalId && date < g.createdAt ? { ...g, createdAt: date } : g))
        set({ days, goals })
        const after = pickData(get())
        const raw = celebrationsFor(before, after, goalId, date)
        // Only fire each milestone once per day.
        const fresh = raw.filter((c) => {
          if (c.type === 'met') return true
          const key = c.type === 'milestone' ? `${c.goal.id}:${c.days}:${date}` : `perfect:${date}`
          if (after.celebrated[key]) return false
          set((s) => ({ celebrated: { ...s.celebrated, [key]: true } }))
          return true
        })
        return fresh
      }

      return {
        ...emptyData(),

        addGoal: (input) => set((s) => ({ goals: [...s.goals, newGoal(input)] })),

        updateGoal: (id, input) =>
          set((s) => ({
            goals: s.goals.map((g) => {
              if (g.id !== id) return g
              const today = todayKey()
              let next: Goal = {
                ...g,
                name: input.name.trim(),
                icon: input.icon,
                unit: input.unit.trim(),
                kind: input.kind,
                period: input.period,
                quickAdds: input.quickAdds,
                overload: input.overload,
              }
              if (input.target !== currentTarget(g)) {
                next = withTarget(next, input.period === 'weekly' ? weekStart(today) : today, input.target)
              }
              return next
            }),
          })),

        archiveGoal: (id, archived) =>
          set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, archived } : g)) })),

        deleteGoal: (id) =>
          set((s) => {
            const days: AppData['days'] = {}
            for (const [k, d] of Object.entries(s.days)) {
              const values = { ...d.values }
              delete values[id]
              days[k] = { ...d, values }
            }
            const snoozes = { ...s.snoozes }
            delete snoozes[id]
            return { goals: s.goals.filter((g) => g.id !== id), days, snoozes }
          }),

        reorderGoals: (ids) =>
          set((s) => {
            const byId = new Map(s.goals.map((g) => [g.id, g]))
            const ordered = ids.map((id) => byId.get(id)).filter((g): g is Goal => !!g)
            const rest = s.goals.filter((g) => !ids.includes(g.id))
            return { goals: [...ordered, ...rest] }
          }),

        setValue,
        addValue: (date, goalId, delta) => {
          const current = get().days[date]?.values[goalId] ?? 0
          return setValue(date, goalId, current + delta)
        },

        toggleRest: (date) =>
          set((s) => {
            const day = s.days[date] ?? { values: {} }
            return { days: { ...s.days, [date]: { ...day, rest: !day.rest || undefined } } }
          }),

        setNote: (date, note) =>
          set((s) => {
            const day = s.days[date] ?? { values: {} }
            return { days: { ...s.days, [date]: { ...day, note: note || undefined } } }
          }),

        acceptSuggestion: (goalId) =>
          set((s) => {
            const today = todayKey()
            const goals = s.goals.map((g) => {
              if (g.id !== goalId) return g
              const to = nextTarget(g)
              if (to === null) return g
              return withTarget(g, changeStart(g, s.days, today), to)
            })
            const snoozes = { ...s.snoozes }
            delete snoozes[goalId]
            return { goals, snoozes }
          }),

        snoozeSuggestion: (goalId, days = 3) =>
          set((s) => ({ snoozes: { ...s.snoozes, [goalId]: { until: addDays(todayKey(), days) } } })),

        setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
        setConfetti: (confetti) => set((s) => ({ settings: { ...s.settings, confetti } })),

        importData: (raw) => set(parseData(raw)),
        loadDemo: () => set((s) => ({ ...demoData(), settings: s.settings })),
        reset: () => set((s) => ({ ...emptyData(), settings: s.settings })),
      }
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickData(s),
      merge: (persisted, current) => {
        try {
          return { ...current, ...parseData(persisted) }
        } catch {
          return current
        }
      },
    },
  ),
)

export const selectData = pickData
