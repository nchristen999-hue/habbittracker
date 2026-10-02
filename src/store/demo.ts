import { addDays, todayKey, weekDays, weekStart } from '@/lib/date'
import { emptyData } from '@/lib/storage'
import type { AppData, Goal } from '@/lib/types'

/** Small deterministic PRNG so demo data looks the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ~10 weeks of plausible history, so stats, heatmap and an overload suggestion are visible. */
export function demoData(today = todayKey()): AppData {
  const rnd = mulberry32(42)
  const start = addDays(today, -70)
  const d = (n: number) => addDays(today, n)

  const goals: Goal[] = [
    {
      id: 'demo-pushups',
      name: 'Liegestütze',
      icon: 'Dumbbell',
      unit: 'Wdh.',
      kind: 'min',
      period: 'daily',
      targets: [
        { from: start, target: 70 },
        { from: d(-48), target: 80 },
        { from: d(-26), target: 90 },
      ],
      quickAdds: [10, 25],
      overload: { enabled: true, after: 7, step: 10 },
      createdAt: start,
      archived: false,
    },
    {
      id: 'demo-kcal',
      name: 'Kalorien',
      icon: 'Flame',
      unit: 'kcal',
      kind: 'max',
      period: 'daily',
      targets: [
        { from: start, target: 2400 },
        { from: d(-35), target: 2350 },
      ],
      quickAdds: [100, 500],
      overload: { enabled: true, after: 7, step: 50 },
      createdAt: start,
      archived: false,
    },
    {
      id: 'demo-water',
      name: 'Wasser',
      icon: 'GlassWater',
      unit: 'L',
      kind: 'min',
      period: 'daily',
      targets: [{ from: start, target: 2.5 }],
      quickAdds: [0.25, 0.5],
      overload: { enabled: false, after: 7, step: 0.25 },
      createdAt: start,
      archived: false,
    },
    {
      id: 'demo-read',
      name: 'Lesen',
      icon: 'BookOpen',
      unit: 'Min.',
      kind: 'min',
      period: 'daily',
      targets: [
        { from: start, target: 15 },
        { from: d(-40), target: 20 },
      ],
      quickAdds: [5, 10],
      overload: { enabled: true, after: 10, step: 5 },
      createdAt: start,
      archived: false,
    },
    {
      id: 'demo-sport',
      name: 'Training',
      icon: 'Bike',
      unit: 'Einheiten',
      kind: 'min',
      period: 'weekly',
      targets: [{ from: weekStart(start), target: 3 }],
      quickAdds: [1],
      overload: { enabled: true, after: 4, step: 1 },
      createdAt: start,
      archived: false,
    },
  ]

  const days: AppData['days'] = {}
  const rest = new Set([d(-12), d(-30), d(-51)])
  const notes: Record<string, string> = {
    [d(-3)]: 'Liegestütze in 4 Sätzen statt 6. Fühlt sich leichter an.',
    [d(-12)]: 'Erkältet, Pause.',
    [d(-26)]: 'Neues Ziel: 90.',
  }

  for (let i = -70; i <= -1; i++) {
    const key = d(i)
    if (rest.has(key)) {
      days[key] = { values: {}, rest: true, note: notes[key] }
      continue
    }
    const pushT = i < -48 ? 70 : i < -26 ? 80 : 90
    // The last 9 days are a clean streak → triggers the overload suggestion.
    const pushHit = i >= -9 || rnd() > 0.22
    const push = pushHit ? pushT + Math.round(rnd() * 12) : Math.round(pushT * (0.45 + rnd() * 0.4))
    const kcalT = i < -35 ? 2400 : 2350
    const kcal = Math.round((kcalT - 320 + rnd() * 400) / 10) * 10
    const water = Math.round((2.1 + rnd() * 1.2) * 4) / 4
    const read = rnd() > 0.15 ? 20 + Math.round(rnd() * 20) : Math.round(rnd() * 12)
    const values: Record<string, number> = { 'demo-pushups': push, 'demo-kcal': kcal, 'demo-water': water }
    if (read > 0) values['demo-read'] = read
    days[key] = { values, ...(notes[key] ? { note: notes[key] } : {}) }
  }

  // Training: 2–4 sessions per completed week, spread over the week.
  for (let ws = weekStart(start); ws < weekStart(today); ws = addDays(ws, 7)) {
    const sessions = rnd() > 0.25 ? 3 + (rnd() > 0.7 ? 1 : 0) : 2
    const wd = weekDays(ws).filter((k) => k >= start && days[k] && !days[k].rest)
    for (let s = 0; s < sessions && s < wd.length; s++) {
      const k = wd[Math.floor((s * wd.length) / sessions)]
      days[k].values['demo-sport'] = 1
    }
  }
  // Current week: one session so far (if any past day exists this week).
  const thisWeek = weekDays(weekStart(today)).filter((k) => k < today)
  if (thisWeek.length) days[thisWeek[0]].values['demo-sport'] = 1

  // Today: half-way, so the main screen shows progress in different states.
  days[today] = { values: { 'demo-pushups': 50, 'demo-water': 1.5 } }

  return { ...emptyData(), goals, days }
}
