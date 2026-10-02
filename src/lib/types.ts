import type { DateKey } from './date'

/** "min" = mindestens erreichen (value >= target), "max" = drunter bleiben (value <= target). */
export type GoalKind = 'min' | 'max'

/** Daily goals are evaluated per day, weekly goals sum all entries Mon–Sun. */
export type GoalPeriod = 'daily' | 'weekly'

export interface TargetChange {
  /** First day on which this target applies. */
  from: DateKey
  target: number
}

export interface OverloadConfig {
  enabled: boolean
  /** Consecutive successful periods (days or weeks) before a suggestion appears. */
  after: number
  /** Absolute amount the target moves per step (up for min, down for max). */
  step: number
}

export interface Goal {
  id: string
  name: string
  /** Lucide icon name, see ICONS in lib/icons.ts */
  icon: string
  unit: string
  kind: GoalKind
  period: GoalPeriod
  /** Ordered ascending by `from`. Last entry = current target. Never empty. */
  targets: TargetChange[]
  quickAdds: number[]
  overload: OverloadConfig
  createdAt: DateKey
  archived: boolean
}

export interface DayEntry {
  /** Logged value per goal id. Missing key = nothing logged. */
  values: Record<string, number>
  rest?: boolean
  note?: string
}

export interface Snooze {
  /** Suggestion stays hidden until this day (exclusive). */
  until: DateKey
}

export interface Settings {
  theme: 'dark' | 'light'
  confetti: boolean
}

export interface AppData {
  version: 1
  goals: Goal[]
  days: Record<DateKey, DayEntry>
  snoozes: Record<string, Snooze>
  /** Milestone keys already celebrated, so a toast only fires once. */
  celebrated: Record<string, true>
  settings: Settings
}

export const MILESTONES = [7, 30, 100] as const
