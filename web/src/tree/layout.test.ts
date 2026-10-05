import { describe, expect, it } from 'vitest'
import type { PersonRef, TreeFamily, TreeGraph } from '../api/types'
import { CARD_H, CARD_W, layoutTree, type LayoutNode, type TreeView } from './layout'
import { buildAncestors, indexGraph } from './model'

const person = (id: number): PersonRef => ({ id, givenNames: `P${id}`, surname: '', sex: 'U', birthDate: '', deathDate: '', living: false, portrait: null })
const fam = (id: number, p1: number | null, p2: number | null, children: number[]): TreeFamily => ({
  id,
  partner1Id: p1,
  partner2Id: p2,
  unionType: 'married',
  children: children.map((personId) => ({ personId, relationPartner1: 'birth', relationPartner2: 'birth' })),
})
const graph = (rootId: number, ids: number[], families: TreeFamily[]): TreeGraph => ({
  rootId,
  persons: Object.fromEntries(ids.map((id) => [String(id), person(id)])),
  families,
  truncated: false,
})

// 1 is the root. Parents 2 & 3, grandparents 4 & 5 (of 2) and 6 (of 3, other
// parent unknown). Sibling 7. Partners 8 (children 10, 11) and 9 (child 12).
// 10 has partner 13 and child 14.
const family = graph(
  1,
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  [
    fam(100, 2, 3, [1, 7]),
    fam(101, 4, 5, [2]),
    fam(102, 6, null, [3]),
    fam(103, 1, 8, [10, 11]),
    fam(104, 1, 9, [12]),
    fam(105, 10, 13, [14]),
  ],
)

const layout = (view: TreeView, generations = 3, bloodOnly = false) => layoutTree(indexGraph(family), { view, generations, bloodOnly })
const byId = (nodes: LayoutNode[]) => new Map(nodes.map((n) => [n.id, n]))
const cx = (n: LayoutNode) => n.x + n.w / 2

function expectNoOverlaps(nodes: LayoutNode[]) {
  const cards = nodes.filter((n) => n.kind !== 'junction')
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]!
      const b = cards[j]!
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
    }
  }
}

function expectEdgesResolve(l: ReturnType<typeof layout>) {
  const ids = new Set(l.nodes.map((n) => n.id))
  for (const e of l.edges) {
    expect(ids.has(e.source), `edge source ${e.source}`).toBe(true)
    expect(ids.has(e.target), `edge target ${e.target}`).toBe(true)
  }
}

describe('tree layout', () => {
  it('pedigree: parents above, centered over their child, unknown parent as a placeholder', () => {
    const l = layout('pedigree')
    const n = byId(l.nodes)
    expect(n.get('p1')!.root).toBe(true)
    expect(n.get('p2')!.y).toBeLessThan(n.get('p1')!.y)
    expect(n.get('p4')!.y).toBeLessThan(n.get('p2')!.y)
    // The child sits midway between its parents, as does the junction.
    expect(cx(n.get('p1')!)).toBeCloseTo((cx(n.get('p2')!) + cx(n.get('p3')!)) / 2)
    expect(cx(n.get('f100')!)).toBeCloseTo(cx(n.get('p1')!))
    expect(l.nodes.filter((x) => x.kind === 'unknown')).toHaveLength(1)
    expect(l.edges.map((e) => e.id)).toEqual(expect.arrayContaining(['p2-f100', 'p3-f100', 'f100-p1']))
    // No descendants or siblings in a pedigree.
    expect(n.has('p7')).toBe(false)
    expect(n.has('p10')).toBe(false)
    expectNoOverlaps(l.nodes)
    expectEdgesResolve(l)
  })

  it('limits generations', () => {
    const n = byId(layout('pedigree', 1).nodes)
    expect(n.has('p2')).toBe(true)
    expect(n.has('p4')).toBe(false)
  })

  it('descendants: partners beside the person, children below, junction between each couple', () => {
    const l = layout('descendants')
    const n = byId(l.nodes)
    expect(n.get('p8')!.y).toBe(n.get('p1')!.y)
    expect(n.get('p8')!.x).toBeGreaterThan(n.get('p1')!.x)
    expect(n.get('p9')!.x).toBeGreaterThan(n.get('p8')!.x)
    expect(n.get('p10')!.y).toBeGreaterThan(n.get('p1')!.y)
    expect(n.get('p14')!.y).toBeGreaterThan(n.get('p10')!.y)
    const j = n.get('f103')!
    expect(cx(j)).toBeGreaterThan(n.get('p1')!.x + CARD_W)
    expect(cx(j)).toBeLessThan(n.get('p8')!.x)
    expect(j.y).toBeGreaterThan(n.get('p1')!.y + CARD_H)
    expect(j.y).toBeLessThan(n.get('p10')!.y)
    expectNoOverlaps(l.nodes)
    expectEdgesResolve(l)
  })

  it('blood relatives only hides partners but keeps their children', () => {
    const n = byId(layout('descendants', 3, true).nodes)
    expect(n.has('p8')).toBe(false)
    expect(n.has('p13')).toBe(false)
    expect(n.has('p10')).toBe(true)
    expect(n.has('p14')).toBe(true)
  })

  it('hourglass: the root is shared and both halves line up on it', () => {
    const l = layout('hourglass')
    const n = byId(l.nodes)
    expect(l.nodes.filter((x) => x.id === 'p1')).toHaveLength(1)
    expect(cx(n.get('p1')!)).toBeCloseTo(0)
    expect(n.get('p4')!.y).toBeLessThan(0)
    expect(n.get('p14')!.y).toBeGreaterThan(0)
    expectNoOverlaps(l.nodes)
    expectEdgesResolve(l)
  })

  it('family group: one generation each way plus the siblings', () => {
    const l = layout('family', 5)
    const n = byId(l.nodes)
    expect(n.has('p2')).toBe(true)
    expect(n.has('p4')).toBe(false)
    expect(n.has('p10')).toBe(true)
    expect(n.has('p14')).toBe(false)
    expect(n.get('p7')!.y).toBe(n.get('p1')!.y)
    expect(n.get('p7')!.x).toBeLessThan(n.get('p1')!.x)
    expect(l.edges.map((e) => e.id)).toContain('f100-p7')
    expectNoOverlaps(l.nodes)
    expectEdgesResolve(l)
  })

  it('draws an ancestor reached twice once, with a stub at the second place', () => {
    // Cousins 2 and 3 married: both descend from 4 & 5.
    const collapsed = graph(1, [1, 2, 3, 4, 5, 6, 7], [
      fam(100, 2, 3, [1]),
      fam(101, 6, null, [2]),
      fam(102, 7, null, [3]),
      fam(103, 4, 5, [6, 7]),
    ])
    const idx = indexGraph(collapsed)
    const tree = buildAncestors(idx, 1, 5)
    const kinds: string[] = []
    const walk = (a: typeof tree) => {
      kinds.push(a.kind)
      if (a.kind === 'person') a.parents.forEach(walk)
    }
    walk(tree)
    expect(kinds.filter((k) => k === 'repeat')).toHaveLength(2)

    const l = layoutTree(idx, { view: 'pedigree', generations: 5, bloodOnly: false })
    expect(l.nodes.filter((x) => x.id === 'p4')).toHaveLength(1)
    expect(l.nodes.filter((x) => x.kind === 'repeat').map((x) => x.personId).sort()).toEqual([4, 5])
    expectNoOverlaps(l.nodes)
    expectEdgesResolve(l)
  })

  it('prefers the birth family when someone has adoptive parents too', () => {
    const g = graph(1, [1, 2, 3], [
      { ...fam(100, 2, null, [1]), children: [{ personId: 1, relationPartner1: 'adopted', relationPartner2: 'birth' }] },
      fam(101, 3, null, [1]),
    ])
    const n = byId(layoutTree(indexGraph(g), { view: 'pedigree', generations: 2, bloodOnly: false }).nodes)
    expect(n.has('p3')).toBe(true)
    expect(n.has('p2')).toBe(false)
  })
})
