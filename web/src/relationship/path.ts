import type { RelationshipReport } from '../api/types'

export type PathStep = { id: number; link: 'parent' | 'child' | 'spouse' | null }

/** The people from A to B, each with how they relate to the one before. */
export function relationshipPath(rep: RelationshipReport): PathStep[] {
  const k = rep.kinship
  if (rep.kind === 'spouse') return [{ id: rep.a, link: null }, { id: rep.b, link: 'spouse' }]
  if (!k) return []
  const blood = (ids: number[], offset: number): PathStep[] =>
    ids.map((id, i) => ({ id, link: i === 0 ? null : i + offset <= k.up ? 'parent' : 'child' }))
  if (rep.kind === 'relative_of_spouse') {
    const rest = k.path.slice(1)
    return [{ id: rep.a, link: null }, ...blood(rest, 0).map((s, i) => (i === 0 ? { ...s, link: 'spouse' as const } : s))]
  }
  if (rep.kind === 'spouse_of_relative') {
    const steps = blood(k.path.slice(0, -1), 0)
    return [...steps, { id: rep.b, link: 'spouse' }]
  }
  return blood(k.path, 0)
}
