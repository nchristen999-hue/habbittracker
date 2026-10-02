/**
 * Date helpers. All dates are local calendar days encoded as "YYYY-MM-DD" keys,
 * so a day never shifts because of time zones or DST.
 */
export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now)
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function diffDays(a: DateKey, b: DateKey): number {
  // Use UTC to avoid DST off-by-one.
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
}

/** Monday of the ISO week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  return addDays(key, -dow)
}

export function weekDays(start: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

const longFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatLong = (key: DateKey) => longFmt.format(fromKey(key))
export const formatShort = (key: DateKey) => shortFmt.format(fromKey(key))
export const formatFull = (key: DateKey) => fullFmt.format(fromKey(key))

export function relativeLabel(key: DateKey, today: DateKey): string {
  const d = diffDays(today, key)
  if (d === 0) return 'Heute'
  if (d === 1) return 'Gestern'
  if (d === -1) return 'Morgen'
  return formatLong(key)
}
