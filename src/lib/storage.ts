import { todayKey } from './date'
import type { AppData, Goal } from './types'

export const STORAGE_KEY = 'overload:v1'

export function emptyData(): AppData {
  return {
    version: 1,
    goals: [],
    days: {},
    snoozes: {},
    celebrated: {},
    settings: { theme: 'dark', confetti: true },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function sanitizeGoal(raw: unknown): Goal | null {
  if (!isObj(raw)) return null
  const g = raw as Partial<Goal>
  if (typeof g.id !== 'string' || typeof g.name !== 'string') return null
  if (!Array.isArray(g.targets) || !g.targets.length) return null
  const targets = g.targets
    .filter((t) => isObj(t) && typeof t.from === 'string' && typeof t.target === 'number')
    .sort((a, b) => a.from.localeCompare(b.from))
  if (!targets.length) return null
  return {
    id: g.id,
    name: g.name,
    icon: typeof g.icon === 'string' ? g.icon : 'Target',
    unit: typeof g.unit === 'string' ? g.unit : '',
    kind: g.kind === 'max' ? 'max' : 'min',
    period: g.period === 'weekly' ? 'weekly' : 'daily',
    targets,
    quickAdds: Array.isArray(g.quickAdds) ? g.quickAdds.filter((n) => typeof n === 'number') : [1],
    overload: {
      enabled: g.overload?.enabled ?? true,
      after: Math.max(1, Number(g.overload?.after) || 7),
      step: Math.max(0.01, Number(g.overload?.step) || 1),
    },
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : targets[0].from,
    archived: !!g.archived,
  }
}

/** Validate and normalise unknown JSON (from storage or an imported backup). Throws on garbage. */
export function parseData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('Keine gültige Overload-Sicherung.')
  // Accept both the bare data object and zustand's persist envelope { state, version }.
  const src = isObj(raw.state) ? raw.state : raw
  if (!Array.isArray(src.goals) || !isObj(src.days)) throw new Error('Keine gültige Overload-Sicherung.')
  const days: AppData['days'] = {}
  for (const [k, v] of Object.entries(src.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isObj(v)) continue
    const values: Record<string, number> = {}
    if (isObj(v.values)) for (const [id, n] of Object.entries(v.values)) if (typeof n === 'number' && Number.isFinite(n)) values[id] = n
    days[k] = {
      values,
      ...(v.rest ? { rest: true } : {}),
      ...(typeof v.note === 'string' && v.note ? { note: v.note } : {}),
    }
  }
  const settings = isObj(src.settings) ? src.settings : {}
  return {
    version: 1,
    goals: src.goals.map(sanitizeGoal).filter((g): g is Goal => g !== null),
    days,
    snoozes: isObj(src.snoozes) ? (src.snoozes as AppData['snoozes']) : {},
    celebrated: isObj(src.celebrated) ? (src.celebrated as AppData['celebrated']) : {},
    settings: {
      theme: settings.theme === 'light' ? 'light' : 'dark',
      confetti: settings.confetti !== false,
    },
  }
}

export function exportData(data: AppData): string {
  return JSON.stringify({ app: 'overload', exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function downloadBackup(data: AppData) {
  const blob = new Blob([exportData(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `overload-backup-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
