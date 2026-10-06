import { ROW_H, type LayoutNode, type TreeLayout } from './layout'

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
  /** Index into the palette's leaf colours, darkest first. */
  shade: number
}

export interface Palette {
  /** Soft colours of the crown behind the cards, back to front. */
  canopy: string[]
  canopyOpacity: number
  bark: string
  barkDark: string
  barkLight: string
  leaves: string[]
  leafEdge: string
  grass: string
  grassDark: string
}

export const lightPalette: Palette = {
  canopy: ['#c9dfae', '#b6d396', '#a3c781'],
  canopyOpacity: 0.55,
  bark: '#6b4a2b',
  barkDark: '#45301b',
  barkLight: '#9a7048',
  leaves: ['#2f6b2f', '#3f7d3a', '#4f8f3f', '#6aa84f', '#8cbf5f'],
  leafEdge: '#23502a',
  grass: '#86b15e',
  grassDark: '#5f8f43',
}

export const darkPalette: Palette = {
  canopy: ['#16291a', '#1b3220', '#203a25'],
  canopyOpacity: 0.8,
  bark: '#8a6240',
  barkDark: '#5e4128',
  barkLight: '#b58a5e',
  leaves: ['#2c5e2c', '#3a7135', '#4a823b', '#5f9a48', '#7fb058'],
  leafEdge: '#173a1d',
  grass: '#3f6b34',
  grassDark: '#2c5226',
}

/** A leaf 15 units long pointing right from its stem at the origin. */
export const LEAF_PATH = 'M0 0 Q 3 -5 9 -4.2 Q 13 -2.4 15 0 Q 13 2.4 9 4.2 Q 3 5 0 0 Z'
/** A heart 12 units wide, centred on the origin. */
export const HEART_PATH =
  'M0 4.5 C -1 3.5 -6 0.5 -6 -2 C -6 -4.5 -2.5 -5.5 0 -3 C 2.5 -5.5 6 -4.5 6 -2 C 6 0.5 1 3.5 0 4.5 Z'

const r1 = (n: number) => Math.round(n * 10) / 10
/** xs[i] for an index known to be in range. */
const at = <T,>(xs: T[], i: number): T => xs[i] as T

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A small seeded generator (mulberry32), so a tree grows the same way every time. */
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

/**
 * A bough from a, where a couple meets, to b on a card: it leaves a
 * sideways and bends to reach b straight, the way branches grow.
 */
function curve(a: Point, b: Point, t: number): Point {
  const c1 = { x: a.x + (b.x - a.x) * 0.65, y: a.y }
  const c2 = { x: b.x, y: a.y + (b.y - a.y) * 0.35 }
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  }
}

/** Left-hand unit normals of a polyline, from its neighbouring points. */
function normals(pts: Point[]): Point[] {
  return pts.map((_, i) => {
    const p = at(pts, Math.max(0, i - 1))
    const q = at(pts, Math.min(pts.length - 1, i + 1))
    const dx = q.x - p.x
    const dy = q.y - p.y
    const len = Math.hypot(dx, dy) || 1
    return { x: -dy / len, y: dx / len }
  })
}

/**
 * A filled outline around a polyline, widths[i] wide at pts[i], with
 * round ends. SVG strokes cannot taper, so both sides are traced.
 */
export function ribbon(pts: Point[], widths: number[]): string {
  const ns = normals(pts)
  const left = pts.map((p, i) => `${r1(p.x + (at(ns, i).x * at(widths, i)) / 2)} ${r1(p.y + (at(ns, i).y * at(widths, i)) / 2)}`)
  const right = pts.map((p, i) => `${r1(p.x - (at(ns, i).x * at(widths, i)) / 2)} ${r1(p.y - (at(ns, i).y * at(widths, i)) / 2)}`)
  const cap = (w: number) => `A ${r1(w / 2)} ${r1(w / 2)} 0 0 0`
  return `M ${left.join(' L ')} ${cap(at(widths, widths.length - 1))} ${right.reverse().join(' L ')} ${cap(at(widths, 0))} ${left[0]} Z`
}

const polyline = (pts: Point[]) => `M ${pts.map((p) => `${r1(p.x)} ${r1(p.y)}`).join(' L ')}`

/** A smooth branch outline from a to b without any irregularity. */
export function branchPath(a: Point, b: Point, wa: number, wb: number, steps = 12): string {
  const pts = Array.from({ length: steps + 1 }, (_, i) => curve(a, b, i / steps))
  return ribbon(
    pts,
    pts.map((_, i) => wa + ((wb - wa) * i) / steps),
  )
}

/** Branches get thinner with each generation away from the root person, like a trunk. */
export function branchWidth(y: number, rootY: number): number {
  return Math.max(3, 12 - 2.5 * (Math.abs(y - rootY) / ROW_H))
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
  const lowerFirst = lowerIsJunction || (!upperIsJunction && Math.abs(lower.y - rootY) < Math.abs(upper.y - rootY))
  const [from, to] = lowerFirst ? [lower, upper] : [upper, lower]
  return { from, to, wFrom: branchWidth(from.y, rootY), wTo: branchWidth(to.y, rootY) * 0.55 }
}

/** Leaves heaped around c within radius r, darker ones first so lighter ones lie on top. */
export function foliage(c: Point, r: number, count: number, rnd: () => number, shades = 5): Leaf[] {
  const out: Leaf[] = []
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2
    const d = r * Math.sqrt(rnd())
    const x = c.x + Math.cos(a) * d
    const y = c.y + Math.sin(a) * d * 0.8
    // Leaves on the upper, sunlit side are lighter.
    const light = Math.min(1, Math.max(0, 0.5 - (y - c.y) / (2 * r) + (rnd() - 0.5) * 0.5))
    out.push({
      x: r1(x),
      y: r1(y),
      angle: Math.round((a * 180) / Math.PI + (rnd() - 0.5) * 80),
      scale: Math.round((0.75 + rnd() * 0.55) * 100) / 100,
      shade: Math.min(shades - 1, Math.floor(light * shades)),
    })
  }
  return out.sort((p, q) => p.shade - q.shade)
}

export interface BranchShape {
  outline: string
  /** A thin lighter line along one side, where the light falls. */
  highlight: string
  /** Short dark streaks of bark. */
  bark: string[]
  twigs: string[]
  leaves: Leaf[]
}

/**
 * A natural-looking branch from `from` to `to`: slightly crooked, with a
 * lit side and bark, a twig or two ending in leaves, and foliage where it
 * reaches the card.
 */
export function growBranch(from: Point, to: Point, wFrom: number, wTo: number, seed: string): BranchShape {
  const rnd = random(seed)
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(8, Math.min(28, Math.round(length / 10)))
  const smooth = Array.from({ length: steps + 1 }, (_, i) => curve(from, to, i / steps))
  const ns0 = normals(smooth)
  const amp = Math.min(5, length * 0.03)
  const freq = 1 + rnd() * 1.5
  const phase = rnd() * Math.PI * 2
  // Crooked in the middle, anchored at both ends.
  const pts = smooth.map((p, i) => {
    const t = i / steps
    const off = amp * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * freq * t + phase)
    return { x: p.x + at(ns0, i).x * off, y: p.y + at(ns0, i).y * off }
  })
  const widths = pts.map((_, i) => wFrom + ((wTo - wFrom) * i) / steps)
  const ns = normals(pts)

  const lit = pts.map((p, i) => ({ x: p.x + at(ns, i).x * at(widths, i) * 0.22, y: p.y + at(ns, i).y * at(widths, i) * 0.22 }))

  const bark: string[] = []
  if (wFrom > 5) {
    for (let k = 0; k < Math.floor(length / 45); k++) {
      const s = 1 + Math.floor(rnd() * (steps - 4))
      const side = (rnd() - 0.5) * 0.5
      const seg = pts.slice(s, s + 3).map((p, j) => ({
        x: p.x + at(ns, s + j).x * at(widths, s + j) * side,
        y: p.y + at(ns, s + j).y * at(widths, s + j) * side,
      }))
      bark.push(polyline(seg))
    }
  }

  const twigs: string[] = []
  const leaves: Leaf[] = []
  const twigCount = length < 50 ? 0 : length < 140 ? 1 : 2
  for (let k = 0; k < twigCount; k++) {
    const t = 0.3 + (k + rnd()) * (0.45 / twigCount)
    const i = Math.round(t * steps)
    const base = at(pts, i)
    const side = (k + Math.floor(rnd() * 2)) % 2 === 0 ? 1 : -1
    const next = at(pts, Math.min(steps, i + 1))
    const prev = at(pts, Math.max(0, i - 1))
    const dir = { x: next.x - prev.x, y: next.y - prev.y }
    const dl = Math.hypot(dir.x, dir.y) || 1
    const ang = Math.atan2(dir.y, dir.x) + side * (0.6 + rnd() * 0.4)
    const tl = 16 + rnd() * 14
    const tip = { x: base.x + Math.cos(ang) * tl, y: base.y + Math.sin(ang) * tl }
    const mid = {
      x: (base.x + tip.x) / 2 + (-dir.y / dl) * side * 3,
      y: (base.y + tip.y) / 2 + (dir.x / dl) * side * 3,
    }
    twigs.push(ribbon([base, mid, tip], [Math.max(1.6, at(widths, i) * 0.45), 1.3, 0.6]))
    leaves.push(...foliage(tip, 9, 7, rnd))
  }
  leaves.push(...foliage(to, 18, 12, rnd))
  leaves.push(...foliage(from, 8, 4, rnd))

  return {
    outline: ribbon(pts, widths),
    highlight: polyline(lit.slice(1, -1)),
    bark,
    twigs,
    leaves: leaves.sort((p, q) => p.shade - q.shade),
  }
}

export interface TrunkShape {
  trunk: string
  /** The sunlit left side of the trunk. */
  lit: string
  bark: string[]
  roots: string[]
  ground: string
  blades: string[]
}

/** Size of the trunk below the root person, in layout units. */
export const TRUNK = { w: 300, h: 170, overlap: 12 }

/**
 * The trunk under the root person, its roots and a patch of grass, in
 * coordinates with the origin at the top centre of the trunk.
 */
export function growTrunk(seed: string, topWidth = 26): TrunkShape {
  const rnd = random(seed)
  const h = 118
  const base = 64
  const wob = () => (rnd() - 0.5) * 4
  const left = `M ${-topWidth / 2} 0 C ${r1(-topWidth / 2 + wob())} ${h * 0.45} ${r1(-topWidth / 2 - 4 + wob())} ${h * 0.75} ${-base / 2} ${h}`
  const right = `L ${base / 2} ${h} C ${r1(topWidth / 2 + 4 + wob())} ${h * 0.75} ${r1(topWidth / 2 + wob())} ${h * 0.45} ${topWidth / 2} 0 Z`
  const bark: string[] = []
  for (let k = 0; k < 5; k++) {
    const x = -topWidth / 2 + 6 + (k * (topWidth - 12)) / 4 + wob()
    const y0 = 8 + rnd() * 20
    const y1 = y0 + 30 + rnd() * 40
    bark.push(
      `M ${r1(x)} ${r1(y0)} Q ${r1(x * 1.4 + wob())} ${r1((y0 + y1) / 2)} ${r1(x * 1.9)} ${r1(Math.min(h - 4, y1))}`,
    )
  }
  const roots: string[] = []
  for (const [dx, reach, drop] of [
    [-0.42, -70, 22],
    [-0.2, -38, 30],
    [0.02, 6, 34],
    [0.24, 42, 28],
    [0.44, 74, 20],
  ] as const) {
    const start = { x: dx * base + wob(), y: h - 6 }
    const end = { x: start.x + reach + wob() * 3, y: h + drop + wob() }
    const mid = { x: (start.x + end.x) / 2, y: start.y + (end.y - start.y) * 0.35 }
    roots.push(ribbon([start, mid, end], [14, 6, 1.2]))
  }
  const ground = `M ${-TRUNK.w / 2 + 6} ${h + 30} Q ${-TRUNK.w / 4} ${h - 2} 0 ${h + 4} Q ${TRUNK.w / 4} ${h - 2} ${TRUNK.w / 2 - 6} ${h + 30} Q 0 ${h + 44} ${-TRUNK.w / 2 + 6} ${h + 30} Z`
  const blades: string[] = []
  for (let k = 0; k < 26; k++) {
    const x = -TRUNK.w / 2 + 24 + rnd() * (TRUNK.w - 48)
    const y = h + 10 + rnd() * 22
    const lean = (rnd() - 0.5) * 8
    blades.push(`M ${r1(x)} ${r1(y)} q ${r1(lean / 2)} -4 ${r1(lean)} ${r1(-6 - rnd() * 6)}`)
  }
  const lit = `M ${-topWidth / 2 + 3} 2 C ${-topWidth / 2 + 4} ${h * 0.45} ${-topWidth / 2} ${h * 0.75} ${-base / 2 + 8} ${h - 4} L ${-base / 2 + 16} ${h - 4} C ${-topWidth / 2 + 8} ${h * 0.7} ${-topWidth / 2 + 9} ${h * 0.4} ${-topWidth / 2 + 9} 2 Z`
  return { trunk: `${left} ${right}`, lit, bark, roots, ground, blades }
}

export interface Blob {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Index into the palette's canopy colours. */
  shade: number
}

const CANOPY_PAD = 60

/**
 * Soft clouds of foliage behind every card, so the generations sit in a
 * crown, relative to the canopy node's top left corner.
 */
export function growCanopy(layout: TreeLayout, origin: Point): Blob[] {
  const out: Blob[] = []
  for (const n of layout.nodes) {
    if (n.kind !== 'person' && n.kind !== 'unknown') continue
    const rnd = random(`canopy-${n.id}`)
    const cx = n.x + n.w / 2 - origin.x
    const cy = n.y + n.h / 2 - origin.y
    for (const [dx, dy, shade] of [
      [-0.32, -0.15, 0],
      [0.34, -0.25, 0],
      [0, -0.55, 1],
      [-0.12, 0.35, 1],
      [0.2, 0.1, 2],
    ] as const) {
      out.push({
        cx: r1(cx + dx * n.w + (rnd() - 0.5) * 16),
        cy: r1(cy + dy * n.h * 1.6 + (rnd() - 0.5) * 10),
        rx: r1(n.w * (0.34 + rnd() * 0.12)),
        ry: r1(n.h * (0.75 + rnd() * 0.3)),
        shade,
      })
    }
  }
  return out.sort((a, b) => a.shade - b.shade)
}

/**
 * The layout with the crown behind all cards and, when nothing hangs
 * below the root person (as in a pedigree, where the ancestors are the
 * crown), a trunk under that card.
 */
export function withTrunk(layout: TreeLayout): TreeLayout {
  const cards = layout.nodes.filter((n) => n.kind === 'person' || n.kind === 'unknown')
  const extra: LayoutNode[] = []
  if (cards.length > 0) {
    const minX = Math.min(...cards.map((n) => n.x)) - CANOPY_PAD
    const minY = Math.min(...cards.map((n) => n.y)) - CANOPY_PAD
    const maxX = Math.max(...cards.map((n) => n.x + n.w)) + CANOPY_PAD
    const maxY = Math.max(...cards.map((n) => n.y + n.h)) + CANOPY_PAD
    extra.push({ id: 'canopy', kind: 'canopy', x: minX, y: minY, w: maxX - minX, h: maxY - minY })
  }
  const root = layout.nodes.find((n) => n.root && n.kind === 'person')
  if (!root || layout.edges.some((e) => e.source === root.id)) {
    return { nodes: [...extra, ...layout.nodes], edges: layout.edges }
  }
  const trunk: LayoutNode = {
    id: 'trunk',
    kind: 'trunk',
    x: root.x + root.w / 2 - TRUNK.w / 2,
    y: root.y + root.h - TRUNK.overlap,
    w: TRUNK.w,
    h: TRUNK.h,
  }
  return { nodes: [...extra, trunk, ...layout.nodes], edges: layout.edges }
}
