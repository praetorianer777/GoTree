import type { MapData } from '../api/types'

/** Without a recorded death, someone leaves the map this long after their first event. */
export const MAX_YEARS_WITHOUT_DEATH = 100

const year = (key: number) => Math.floor(key / 10000)

/** The years the map can show: from the first event to the last event or death, not past this year. */
export function yearRange(data: MapData, thisYear: number): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (const t of data.tracks) {
    const first = t.points[0]
    const last = t.points[t.points.length - 1]
    if (!first || !last) continue
    lo = Math.min(lo, year(first.key))
    hi = Math.max(hi, year(last.key), t.death ? year(t.death) : 0)
  }
  if (lo === Infinity) return null
  return [lo, Math.min(Math.max(hi, lo), thisYear)]
}

/**
 * Who was where at the end of a year: each person at the place of their
 * latest event up to then, from their first event until their death.
 */
export function positionsAt(data: MapData, y: number): Map<number, number[]> {
  const out = new Map<number, number[]>()
  const limit = y * 10000 + 1231
  for (const t of data.tracks) {
    const first = t.points[0]
    if (!first || first.key > limit) continue
    if (t.death ? year(t.death) < y : y > year(first.key) + MAX_YEARS_WITHOUT_DEATH) continue
    let place = first.placeId
    for (const p of t.points) {
      if (p.key > limit) break
      place = p.placeId
    }
    out.set(place, [...(out.get(place) ?? []), t.personId])
  }
  return out
}
