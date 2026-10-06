export interface Point {
  x: number
  y: number
}

export interface VineLeaf {
  x: number
  y: number
  /** Degrees; 0 points right. */
  angle: number
  scale: number
  /** Index into the palette's leaf colours. */
  shade: number
}

export interface Vine {
  stem: string
  leaves: VineLeaf[]
  /** Small curling tendrils. */
  curls: string[]
}

/** Colours of the vines, for the light and the dark theme. */
export interface Palette {
  stem: string
  leaves: [string, string, string]
  heart: string
}

export const lightPalette: Palette = {
  stem: '#5f7440',
  leaves: ['#4f7a3a', '#6a9448', '#88a85a'],
  heart: '#be123c',
}

export const darkPalette: Palette = {
  stem: '#a3b97c',
  leaves: ['#5f8a4a', '#7aa35a', '#9cba72'],
  heart: '#fb7185',
}

/** An ivy-like leaf 9 units long, stem at the origin, pointing right. */
export const VINE_LEAF = 'M0 0 C 1.5 -3.2 5 -3.6 9 0 C 5 3.6 1.5 3.2 0 0 Z'
/** A heart 12 units wide, centred on the origin. */
export const HEART_PATH =
  'M0 4.5 C -1 3.5 -6 0.5 -6 -2 C -6 -4.5 -2.5 -5.5 0 -3 C 2.5 -5.5 6 -4.5 6 -2 C 6 0.5 1 3.5 0 4.5 Z'

const r1 = (n: number) => Math.round(n * 10) / 10

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A small seeded generator (mulberry32), so a vine grows the same way every time. */
export function random(seed: string): () => number {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The connector route: down, across and down again, with rounded corners. */
function route(a: Point, b: Point): Point[] {
  const mid = (a.y + b.y) / 2
  const dx = b.x - a.x
  const r = Math.min(14, Math.abs(dx) / 2, Math.abs(b.y - a.y) / 2)
  if (r < 0.5) return [a, { x: a.x, y: mid }, { x: b.x, y: mid }, b]
  const sx = Math.sign(dx)
  const corner = (from: Point, ctrl: Point, to: Point) =>
    Array.from({ length: 6 }, (_, i) => {
      const t = (i + 1) / 6
      const u = 1 - t
      return {
        x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      }
    })
  const c1 = { x: a.x, y: mid - r }
  const c2 = { x: b.x - sx * r, y: mid }
  return [
    a,
    c1,
    ...corner(c1, { x: a.x, y: mid }, { x: a.x + sx * r, y: mid }),
    c2,
    ...corner(c2, { x: b.x, y: mid }, { x: b.x, y: mid + r }),
    b,
  ]
}

/** Points every `step` units along a polyline, with their unit direction. */
function resample(pts: Point[], step: number): { p: Point; d: Point; s: number }[] {
  const out: { p: Point; d: Point; s: number }[] = []
  let carry = 0
  let s = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Point
    const b = pts[i + 1] as Point
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len === 0) continue
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
    for (let t = carry; t < len; t += step) {
      out.push({ p: { x: a.x + d.x * t, y: a.y + d.y * t }, d, s: s + t })
    }
    carry = (carry - len) % step
    if (carry < 0) carry += step
    s += len
  }
  const last = pts[pts.length - 1] as Point
  const tail = out[out.length - 1]
  out.push({ p: last, d: tail?.d ?? { x: 0, y: 1 }, s })
  return out
}

/**
 * A vine along the connector from `upper` to `lower`: a gently wavy stem
 * with leaves on alternating sides and now and then a curling tendril.
 * Seeded, so the same connector always grows the same vine.
 */
export function growVine(upper: Point, lower: Point, seed: string): Vine {
  const rnd = random(seed)
  const samples = resample(route(upper, lower), 3)
  const total = samples[samples.length - 1]?.s ?? 0
  const wave = 9 + rnd() * 6
  const phase = rnd() * Math.PI * 2
  const amp = 1.4
  // The wave fades out at both ends, so the vine meets cards and hearts cleanly.
  const pts = samples.map(({ p, d, s }) => {
    const fade = Math.min(1, s / 8, (total - s) / 8)
    const off = amp * fade * Math.sin(s / wave + phase)
    return { x: p.x - d.y * off, y: p.y + d.x * off }
  })
  const stem = `M ${pts.map((p) => `${r1(p.x)} ${r1(p.y)}`).join(' L ')}`

  const leaves: VineLeaf[] = []
  const curls: string[] = []
  let side = rnd() < 0.5 ? 1 : -1
  for (let s = 10 + rnd() * 6; s < total - 10; s += 16 + rnd() * 10) {
    const i = Math.min(samples.length - 1, Math.round(s / 3))
    const sample = samples[i]
    const p = pts[i]
    if (!sample || !p) continue
    const { d } = sample
    const n = { x: -d.y * side, y: d.x * side }
    const along = (Math.atan2(d.y, d.x) * 180) / Math.PI
    leaves.push({
      x: r1(p.x + n.x * 0.8),
      y: r1(p.y + n.y * 0.8),
      angle: Math.round(along + side * (50 + rnd() * 25)),
      scale: Math.round((0.75 + rnd() * 0.35) * 100) / 100,
      shade: Math.floor(rnd() * 3),
    })
    if (rnd() < 0.22) {
      // A tendril spirals out on the other side of the stem.
      const c = { x: p.x - n.x * 4.5, y: p.y - n.y * 4.5 }
      const a0 = Math.atan2(p.y - c.y, p.x - c.x)
      const turn = side * (rnd() < 0.5 ? 1 : -1)
      const spiral = Array.from({ length: 14 }, (_, k) => {
        const t = (k / 13) * Math.PI * 2.2
        const r = 4.5 * (1 - t / (Math.PI * 2.8))
        return `${r1(c.x + Math.cos(a0 + turn * t) * r)} ${r1(c.y + Math.sin(a0 + turn * t) * r)}`
      })
      curls.push(`M ${spiral.join(' L ')}`)
    }
    side = -side
  }
  return { stem, leaves, curls }
}
