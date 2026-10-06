import { describe, expect, it } from 'vitest'
import { branchEnds, branchPath, branchWidth, leavesAlong } from './branches'
import { ROW_H } from './layout'

describe('branches', () => {
  it('is thickest at the root person and thins out per generation', () => {
    expect(branchWidth(500, 500)).toBe(10)
    expect(branchWidth(500 - ROW_H, 500)).toBe(7.5)
    expect(branchWidth(500 + 2 * ROW_H, 500)).toBe(5)
    expect(branchWidth(500 - 10 * ROW_H, 500)).toBe(2.5)
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

  it('places the same leaves for the same branch every time', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 80, y: 140 }
    const leaves = leavesAlong(a, b, 'e1')
    expect(leaves).toHaveLength(4)
    expect(leavesAlong(a, b, 'e1')).toEqual(leaves)
    expect(leavesAlong(a, b, 'e2')).not.toEqual(leaves)
    for (const l of leaves) {
      expect(l.y).toBeGreaterThan(0)
      expect(l.y).toBeLessThan(140)
      expect([0, 1, 2]).toContain(l.shade)
    }
    expect(leavesAlong(a, { x: 5, y: 20 }, 'short')).toEqual([])
  })
})
