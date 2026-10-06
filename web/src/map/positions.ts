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

export interface Trail {
  from: number
  to: number
  /** How many of the people on the map made this move. */
  count: number
  /** The year of the latest such move. */
  last: number
}

/**
 * The moves between places that the people on the map at the end of a
 * year have made so far, merged per pair of places.
 */
export function trailsUntil(data: MapData, y: number, positions = positionsAt(data, y)): Trail[] {
  const shown = new Set([...positions.values()].flat())
  const limit = y * 10000 + 1231
  const out = new Map<string, Trail>()
  for (const t of data.tracks) {
    if (!shown.has(t.personId)) continue
    let prev: number | undefined
    for (const p of t.points) {
      if (p.key > limit) break
      if (prev !== undefined && prev !== p.placeId) {
        const k = `${prev}-${p.placeId}`
        const trail = out.get(k) ?? { from: prev, to: p.placeId, count: 0, last: 0 }
        trail.count++
        trail.last = Math.max(trail.last, year(p.key))
        out.set(k, trail)
      }
      prev = p.placeId
    }
  }
  return [...out.values()]
}

/**
 * A gentle arc from a to b. Bending to the left of the direction of travel
 * keeps a move and its way back apart.
 */
export function arc(a: [number, number], b: [number, number], steps = 16): [number, number][] {
  const [dLat, dLng] = [b[0] - a[0], b[1] - a[1]]
  const ctrl: [number, number] = [(a[0] + b[0]) / 2 + dLng * 0.18, (a[1] + b[1]) / 2 - dLat * 0.18]
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]]
  })
}
