import { ROW_H } from './layout'

export interface Point {
  x: number
  y: number
}

export interface Leaf {
  x: number
  y: number
  /** Degrees; 0 points right. */
  angle: number
  scale: number
  /** Index into the theme's leaf colours. */
  shade: number
}

/** Dark enough to stand out on parchment and on a dark background. */
export const leafColors = ['#3f7d3a', '#5b9a46', '#86b55a']

/** A leaf 12 units long pointing right from its stem at the origin. */
export const LEAF_PATH = 'M0 0 C 3 -4.5 8 -4.5 12 0 C 8 4.5 3 4.5 0 0 Z'
/** A heart 12 units wide, centred on the origin. */
export const HEART_PATH =
  'M0 4.5 C -1 3.5 -6 0.5 -6 -2 C -6 -4.5 -2.5 -5.5 0 -3 C 2.5 -5.5 6 -4.5 6 -2 C 6 0.5 1 3.5 0 4.5 Z'

/**
 * A bough from a, where a couple meets, to b on a card: it leaves a
 * sideways and bends to reach b straight, the way branches grow.
 */
function curve(a: Point, b: Point, t: number): { p: Point; d: Point } {
  const c1 = { x: a.x + (b.x - a.x) * 0.65, y: a.y }
  const c2 = { x: b.x, y: a.y + (b.y - a.y) * 0.35 }
  const u = 1 - t
  const p = {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  }
  const d = {
    x: 3 * u * u * (c1.x - a.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x),
    y: 3 * u * u * (c1.y - a.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y),
  }
  return { p, d }
}

/** The left-hand normal of d; where the curve has no direction yet, that of the chord. */
function normal(d: Point, chord: Point): Point {
  const v = Math.hypot(d.x, d.y) > 1e-6 ? d : chord
  const len = Math.hypot(v.x, v.y) || 1
  return { x: -v.y / len, y: v.x / len }
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * A branch from a to b as a filled outline that is wa wide at a and wb at
 * b. SVG strokes cannot taper, so the outline is traced along both sides;
 * the ends are rounded.
 */
export function branchPath(a: Point, b: Point, wa: number, wb: number, steps = 12): string {
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const { p, d } = curve(a, b, t)
    const n = normal(d, { x: b.x - a.x, y: b.y - a.y })
    const w = (wa + (wb - wa) * t) / 2
    left.push(`${r1(p.x + n.x * w)} ${r1(p.y + n.y * w)}`)
    right.push(`${r1(p.x - n.x * w)} ${r1(p.y - n.y * w)}`)
  }
  const cap = (w: number) => `A ${r1(w / 2)} ${r1(w / 2)} 0 0 0`
  return `M ${left.join(' L ')} ${cap(wb)} ${right.reverse().join(' L ')} ${cap(wa)} ${left[0]} Z`
}

/** Branches get thinner with each generation away from the root person, like a trunk. */
export function branchWidth(y: number, rootY: number): number {
  return Math.max(2.5, 10 - 2.5 * (Math.abs(y - rootY) / ROW_H))
}

/**
 * Orders a connector's ends so the branch grows from where a couple meets
 * (or else from the end nearer the root person) towards the card, and
 * thins out on the way.
 */
export function branchEnds(
  upper: Point,
  lower: Point,
  upperIsJunction: boolean,
  lowerIsJunction: boolean,
  rootY: number,
): { from: Point; to: Point; wFrom: number; wTo: number } {
  const lowerFirst =
    lowerIsJunction || (!upperIsJunction && Math.abs(lower.y - rootY) < Math.abs(upper.y - rootY))
  const [from, to] = lowerFirst ? [lower, upper] : [upper, lower]
  return { from, to, wFrom: branchWidth(from.y, rootY), wTo: branchWidth(to.y, rootY) * 0.6 }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * A few leaves sprouting from a branch, alternating sides. The seed keeps
 * them in the same place on every render and in every export.
 */
export function leavesAlong(a: Point, b: Point, seed: string, width = 4): Leaf[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length < 30) return []
  const h = hash(seed)
  const count = Math.min(5, 2 + Math.floor(length / 70))
  const out: Leaf[] = []
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5 + ((h >>> (i * 3)) & 3) * 0.08) / (count + 0.4)
    const { p, d } = curve(a, b, t)
    const n = normal(d, { x: b.x - a.x, y: b.y - a.y })
    const side = (i + h) % 2 === 0 ? 1 : -1
    const along = (Math.atan2(d.y, d.x) * 180) / Math.PI
    out.push({
      x: r1(p.x + n.x * side * (width / 2)),
      y: r1(p.y + n.y * side * (width / 2)),
      angle: Math.round(along + side * (50 + ((h >>> (i * 5)) & 15))),
      scale: 1.2 + ((h >>> (i * 7)) & 3) * 0.15,
      shade: (h >>> (i * 2)) % 3,
    })
  }
  return out
}
