import type { PersonRef, TreeFamily, TreeGraph } from '../api/types'

export interface TreeIndex {
  rootId: number
  persons: Map<number, PersonRef>
  families: Map<number, TreeFamily>
  /** childId → the families the child belongs to. */
  parentFamilies: Map<number, TreeFamily[]>
  /** personId → the families the person is a partner in. */
  partnerFamilies: Map<number, TreeFamily[]>
}

export function indexGraph(g: TreeGraph): TreeIndex {
  const idx: TreeIndex = {
    rootId: g.rootId,
    persons: new Map(Object.values(g.persons).map((p) => [p.id, p])),
    families: new Map(g.families.map((f) => [f.id, f])),
    parentFamilies: new Map(),
    partnerFamilies: new Map(),
  }
  const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => m.set(k, [...(m.get(k) ?? []), v])
  for (const f of g.families) {
    for (const c of f.children) push(idx.parentFamilies, c.personId, f)
    if (f.partner1Id !== null) push(idx.partnerFamilies, f.partner1Id, f)
    if (f.partner2Id !== null) push(idx.partnerFamilies, f.partner2Id, f)
  }
  return idx
}

/** The family drawn as someone's parents: the birth family if there is one. */
export function primaryParentFamily(idx: TreeIndex, personId: number): TreeFamily | undefined {
  const fams = idx.parentFamilies.get(personId) ?? []
  const birth = fams.find((f) =>
    f.children.some((c) => c.personId === personId && c.relationPartner1 === 'birth' && c.relationPartner2 === 'birth'),
  )
  return birth ?? fams[0]
}

export type AncestorNode =
  | { kind: 'person'; key: string; personId: number; familyId?: number; parents: AncestorNode[] }
  | { kind: 'unknown'; key: string }
  /** Someone already drawn elsewhere in the chart (pedigree collapse). */
  | { kind: 'repeat'; key: string; personId: number }

/** The ancestors of rootId as a binary tree, at most maxDepth generations up. */
export function buildAncestors(idx: TreeIndex, rootId: number, maxDepth: number): AncestorNode {
  const placed = new Set<number>()
  const build = (personId: number, depth: number, key: string): AncestorNode => {
    if (placed.has(personId)) return { kind: 'repeat', key, personId }
    placed.add(personId)
    const node: AncestorNode = { kind: 'person', key, personId, parents: [] }
    const fam = depth < maxDepth ? primaryParentFamily(idx, personId) : undefined
    if (fam && (fam.partner1Id !== null || fam.partner2Id !== null)) {
      node.familyId = fam.id
      node.parents = [fam.partner1Id, fam.partner2Id].map((pid, i) =>
        pid === null || !idx.persons.has(pid)
          ? { kind: 'unknown' as const, key: `${key}.${i}` }
          : build(pid, depth + 1, `${key}.${i}`),
      )
    }
    return node
  }
  return build(rootId, 0, 'a')
}

export interface DescendantFamily {
  familyId: number
  /** null: the other parent is unknown. */
  partnerId: number | null
  /** The partner is drawn elsewhere already, e.g. a cousin marriage. */
  partnerRepeat: boolean
  children: DescendantNode[]
}

export type DescendantNode =
  | { kind: 'person'; key: string; personId: number; families: DescendantFamily[] }
  | { kind: 'repeat'; key: string; personId: number }

/** The descendants of rootId with their partner families, maxDepth generations down. */
export function buildDescendants(idx: TreeIndex, rootId: number, maxDepth: number): DescendantNode {
  const placed = new Set<number>()
  const build = (personId: number, depth: number, key: string): DescendantNode => {
    if (placed.has(personId)) return { kind: 'repeat', key, personId }
    placed.add(personId)
    const node: DescendantNode = { kind: 'person', key, personId, families: [] }
    if (depth >= maxDepth) return node
    for (const f of idx.partnerFamilies.get(personId) ?? []) {
      const partnerId = f.partner1Id === personId ? f.partner2Id : f.partner1Id
      const known = partnerId !== null && idx.persons.has(partnerId)
      const partnerRepeat = known && placed.has(partnerId)
      if (known && !partnerRepeat) placed.add(partnerId)
      node.families.push({
        familyId: f.id,
        partnerId: known ? partnerId : null,
        partnerRepeat,
        children: [],
      })
    }
    // Children are built after all partners are marked, so a partner who
    // is also a descendant is drawn once.
    node.families.forEach((df, i) => {
      const f = idx.families.get(df.familyId)!
      df.children = f.children
        .filter((c) => idx.persons.has(c.personId))
        .map((c, j) => build(c.personId, depth + 1, `${key}.${i}.${j}`))
    })
    return node
  }
  return build(rootId, 0, 'd')
}
