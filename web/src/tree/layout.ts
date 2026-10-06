import { buildAncestors, buildDescendants, primaryParentFamily, type AncestorNode, type DescendantNode, type TreeIndex } from './model'

export const CARD_W = 180
export const CARD_H = 64
export const REPEAT_W = 132
export const GAP_X = 24
export const ROW_H = 140
export const JUNCTION = 12

export type NodeKind = 'person' | 'junction' | 'unknown' | 'repeat' | 'trunk' | 'canopy'

/** A positioned node; x/y is the top-left corner, as React Flow expects. */
export interface LayoutNode {
  id: string
  kind: NodeKind
  x: number
  y: number
  w: number
  h: number
  personId?: number
  familyId?: number
  root?: boolean
}

export interface LayoutEdge {
  id: string
  source: string
  target: string
}

export interface TreeLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
}

export type TreeView = 'pedigree' | 'descendants' | 'hourglass' | 'family'

export interface LayoutOptions {
  view: TreeView
  generations: number
  /** Hide partners who are not descendants of the root. */
  bloodOnly: boolean
}

const personId = (id: number) => `p${id}`
const junctionId = (familyId: number) => `f${familyId}`
const junctionY = (row: number) => row * ROW_H - (ROW_H - CARD_H) / 2 - JUNCTION / 2

/**
 * Minimal tidy layout for trees with nodes of different widths: each
 * subtree is as wide as its node or its children side by side, and a node
 * is centered over its children. d3.tree assumes one node size, but a
 * couple is two or three cards wide.
 */
interface Box {
  width: number
  children: Box[]
  /** Called with the node's center x once it is known. */
  place: (centerX: number) => void
}

function span(b: Box): number {
  const kids = b.children.reduce((sum, c, i) => sum + span(c) + (i > 0 ? GAP_X : 0), 0)
  return Math.max(b.width, kids)
}

function arrange(b: Box, centerX: number) {
  b.place(centerX)
  const total = b.children.reduce((sum, c, i) => sum + span(c) + (i > 0 ? GAP_X : 0), 0)
  let left = centerX - total / 2
  for (const c of b.children) {
    const w = span(c)
    arrange(c, left + w / 2)
    left += w + GAP_X
  }
}

class Builder {
  nodes = new Map<string, LayoutNode>()
  edges = new Map<string, LayoutEdge>()

  node(n: LayoutNode) {
    if (!this.nodes.has(n.id)) this.nodes.set(n.id, n)
    return n.id
  }

  edge(source: string, target: string) {
    const id = `${source}-${target}`
    this.edges.set(id, { id, source, target })
  }

  result(): TreeLayout {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] }
  }
}

function cardNode(n: AncestorNode | DescendantNode | { kind: 'unknown'; key: string }, cx: number, row: number, rootId: number): LayoutNode {
  const y = row * ROW_H
  switch (n.kind) {
    case 'person':
      return { id: personId(n.personId), kind: 'person', personId: n.personId, x: cx - CARD_W / 2, y, w: CARD_W, h: CARD_H, root: n.personId === rootId }
    case 'repeat':
      return { id: `r-${n.key}`, kind: 'repeat', personId: n.personId, x: cx - REPEAT_W / 2, y: y + 8, w: REPEAT_W, h: CARD_H - 16 }
    case 'unknown':
      return { id: `u-${n.key}`, kind: 'unknown', x: cx - CARD_W / 2, y: y + 8, w: CARD_W, h: CARD_H - 16 }
  }
}

/** Ancestors above the root: row 0 is the root, row -1 the parents, … */
function layoutAncestors(b: Builder, root: AncestorNode, rootId: number) {
  const toBox = (n: AncestorNode, row: number, childOf?: string): Box => ({
    width: n.kind === 'repeat' ? REPEAT_W : CARD_W,
    children: n.kind === 'person' ? n.parents.map((p) => toBox(p, row - 1, n.familyId !== undefined ? junctionId(n.familyId) : undefined)) : [],
    place: (cx) => {
      const id = b.node(cardNode(n, cx, row, rootId))
      if (childOf) b.edge(id, childOf)
      if (n.kind === 'person' && n.familyId !== undefined) {
        const j = b.node({ id: junctionId(n.familyId), kind: 'junction', familyId: n.familyId, x: cx - JUNCTION / 2, y: junctionY(row), w: JUNCTION, h: JUNCTION })
        b.edge(j, id)
      }
    },
  })
  arrange(toBox(root, 0), 0)
}

/** Descendants below the root: the person and their partners side by side,
 * a junction under each couple, the children in the next row. */
function layoutDescendants(b: Builder, root: DescendantNode, rootId: number, bloodOnly: boolean) {
  const partnerWidth = (f: { partnerId: number | null; partnerRepeat: boolean }) =>
    bloodOnly || f.partnerId === null ? 0 : f.partnerRepeat ? REPEAT_W : CARD_W

  const toBox = (n: DescendantNode, row: number, childOf?: string): Box => {
    const fams = n.kind === 'person' ? n.families : []
    const width = CARD_W + fams.reduce((sum, f) => sum + (partnerWidth(f) ? GAP_X + partnerWidth(f) : 0), 0)
    return {
      width,
      children: fams.flatMap((f) => f.children.map((c) => toBox(c, row + 1, junctionId(f.familyId)))),
      place: (cx) => {
        let left = cx - width / 2
        const self = b.node(cardNode(n, left + CARD_W / 2, row, rootId))
        if (childOf) b.edge(childOf, self)
        let lastRight = left + CARD_W
        left += CARD_W
        let unknownOffset = 0
        for (const f of fams) {
          const pw = partnerWidth(f)
          let jx: number
          if (pw) {
            const partnerLeft = left + GAP_X
            const partner =
              f.partnerRepeat
                ? b.node({ id: `r-${n.key}-${f.familyId}`, kind: 'repeat', personId: f.partnerId!, x: partnerLeft, y: row * ROW_H + 8, w: pw, h: CARD_H - 16 })
                : b.node({ id: personId(f.partnerId!), kind: 'person', personId: f.partnerId!, x: partnerLeft, y: row * ROW_H, w: pw, h: CARD_H })
            jx = (lastRight + partnerLeft) / 2
            left = partnerLeft + pw
            lastRight = left
            b.edge(partner, junctionId(f.familyId))
          } else {
            // No partner card: the junction sits under the person.
            jx = cx - width / 2 + CARD_W / 2 + unknownOffset
            unknownOffset += JUNCTION * 2
          }
          const j = b.node({ id: junctionId(f.familyId), kind: 'junction', familyId: f.familyId, x: jx - JUNCTION / 2, y: junctionY(row + 1), w: JUNCTION, h: JUNCTION })
          b.edge(self, j)
        }
      },
    }
  }
  const box = toBox(root, 0)
  // Center the root card, not the whole couple, on x = 0 so the ancestor
  // half of an hourglass lines up with it.
  arrange(box, box.width / 2 - CARD_W / 2)
}

export function layoutTree(idx: TreeIndex, opts: LayoutOptions): TreeLayout {
  const b = new Builder()
  const root = idx.rootId
  const gens = opts.view === 'family' ? 1 : opts.generations

  if (opts.view === 'pedigree' || opts.view === 'hourglass' || opts.view === 'family') {
    layoutAncestors(b, buildAncestors(idx, root, gens), root)
  }
  if (opts.view === 'descendants' || opts.view === 'hourglass' || opts.view === 'family') {
    layoutDescendants(b, buildDescendants(idx, root, gens), root, opts.bloodOnly)
  }
  if (opts.view === 'family') addSiblings(b, idx, root)
  return b.result()
}

/** Siblings stand left of the root in its row, under the parents' junction. */
function addSiblings(b: Builder, idx: TreeIndex, rootId: number) {
  const fam = primaryParentFamily(idx, rootId)
  if (!fam) return
  const siblings = fam.children.map((c) => c.personId).filter((id) => id !== rootId && idx.persons.has(id))
  if (siblings.length === 0) return
  const j = junctionId(fam.id)
  if (!b.nodes.has(j)) {
    b.node({ id: j, kind: 'junction', familyId: fam.id, x: -JUNCTION / 2, y: junctionY(0), w: JUNCTION, h: JUNCTION })
    b.edge(j, personId(rootId))
  }
  siblings.forEach((id, i) => {
    const node = b.node({
      id: personId(id),
      kind: 'person',
      personId: id,
      x: -CARD_W / 2 - (i + 1) * (CARD_W + GAP_X),
      y: 0,
      w: CARD_W,
      h: CARD_H,
    })
    b.edge(j, node)
  })
}
