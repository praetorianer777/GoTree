import { describe, expect, it } from 'vitest'
import { growVine } from './vine'

describe('vines', () => {
  const upper = { x: 0, y: 0 }
  const lower = { x: 200, y: 76 }

  it('grows the same vine for the same connector, and another one otherwise', () => {
    const vine = growVine(upper, lower, 'e1')
    expect(growVine(upper, lower, 'e1')).toEqual(vine)
    expect(growVine(upper, lower, 'e2').leaves).not.toEqual(vine.leaves)
  })

  it('starts and ends exactly at the connector ends', () => {
    const { stem } = growVine(upper, lower, 'e1')
    expect(stem.startsWith('M 0 0 L')).toBe(true)
    expect(stem.endsWith('200 76')).toBe(true)
  })

  it('puts leaves on both sides along the way, away from the ends', () => {
    const { leaves } = growVine(upper, lower, 'e1')
    expect(leaves.length).toBeGreaterThan(6)
    for (const l of leaves) {
      expect(Math.hypot(l.x - upper.x, l.y - upper.y)).toBeGreaterThan(6)
      expect(Math.hypot(l.x - lower.x, l.y - lower.y)).toBeGreaterThan(6)
    }
  })

  it('stays a straight short vine between close cards', () => {
    const { stem, leaves } = growVine({ x: 50, y: 0 }, { x: 50, y: 20 }, 'short')
    expect(stem.startsWith('M 50 0')).toBe(true)
    expect(leaves.length).toBeLessThanOrEqual(1)
  })
})
