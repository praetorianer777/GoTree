import { describe, expect, it } from 'vitest'
import {
  branchEnds,
  branchPath,
  branchWidth,
  foliage,
  growBranch,
  growTrunk,
  random,
  TRUNK,
  withTrunk,
} from './branches'
import { ROW_H, type TreeLayout } from './layout'

describe('branches', () => {
  it('is thickest at the root person and thins out per generation', () => {
    expect(branchWidth(500, 500)).toBe(12)
    expect(branchWidth(500 - ROW_H, 500)).toBe(9.5)
    expect(branchWidth(500 + 2 * ROW_H, 500)).toBe(7)
    expect(branchWidth(500 - 10 * ROW_H, 500)).toBe(3)
  })

  it('traces a closed outline as wide as asked at both ends, with round caps', () => {
    const d = branchPath({ x: 0, y: 0 }, { x: 0, y: 100 }, 4, 8, 2)
    expect(d).toBe('M -2 0 L -3 25.6 L -4 100 A 4 4 0 0 0 4 100 L 3 25.6 L 2 0 A 2 2 0 0 0 -2 0 Z')
  })

  it('grows from where a couple meets towards the card and thins out', () => {
    const card = { x: 0, y: 64 }
    const junction = { x: 90, y: 100 }
    const e = branchEnds(card, junction, false, true, 300)
    expect(e.from).toEqual(junction)
    expect(e.to).toEqual(card)
    expect(e.wTo).toBeLessThan(e.wFrom)
  })

  it('grows the same branch for the same seed, and a different one otherwise', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 160, y: -120 }
    const one = growBranch(a, b, 10, 5, 'e1')
    expect(growBranch(a, b, 10, 5, 'e1')).toEqual(one)
    expect(growBranch(a, b, 10, 5, 'e2').outline).not.toBe(one.outline)
    expect(one.twigs).toHaveLength(2)
    expect(one.leaves.length).toBeGreaterThan(20)
    // Lighter leaves are drawn last, on top.
    const shades = one.leaves.map((l) => l.shade)
    expect(shades).toEqual([...shades].sort((x, y) => x - y))
  })

  it('heaps foliage around its centre', () => {
    const leaves = foliage({ x: 50, y: 50 }, 10, 30, random('f'))
    expect(leaves).toHaveLength(30)
    for (const l of leaves) expect(Math.hypot(l.x - 50, l.y - 50)).toBeLessThanOrEqual(10.1)
  })
})

describe('the trunk', () => {
  const card = { id: 'p1', kind: 'person' as const, x: 100, y: 300, w: 180, h: 64, personId: 1, root: true }
  const parents = { id: 'f1', kind: 'junction' as const, x: 184, y: 230, w: 12, h: 12 }

  it('stands under the root person of a pedigree', () => {
    const layout: TreeLayout = { nodes: [parents, card], edges: [{ id: 'e', source: 'f1', target: 'p1' }] }
    const [canopy, trunk] = withTrunk(layout).nodes
    expect(canopy).toMatchObject({ kind: 'canopy' })
    expect(trunk).toMatchObject({ kind: 'trunk', x: 190 - TRUNK.w / 2, y: 364 - TRUNK.overlap })
  })

  it('is left out when descendants hang below the root person', () => {
    const layout: TreeLayout = {
      nodes: [card, { ...parents, y: 400 }],
      edges: [{ id: 'e', source: 'p1', target: 'f1' }],
    }
    expect(withTrunk(layout).nodes.map((n) => n.kind)).toEqual(['canopy', 'person', 'junction'])
  })

  it('has roots and grass', () => {
    const t = growTrunk('trunk')
    expect(t.roots).toHaveLength(5)
    expect(t.blades.length).toBeGreaterThan(10)
    expect(growTrunk('trunk')).toEqual(t)
  })
})
