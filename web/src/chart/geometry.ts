import { thumbUrl } from '../api/endpoints'
import type { PersonRef } from '../api/types'
import type { TreeLayout } from '../tree/layout'

/** The layout's extent in layout units. */
export const bounds = (layout: TreeLayout) => {
  const xs = layout.nodes.flatMap((n) => [n.x, n.x + n.w])
  const ys = layout.nodes.flatMap((n) => [n.y, n.y + n.h])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
}

export const photoUrl = (p: PersonRef) => (p.portrait ? thumbUrl(p.portrait.mediaId, 128, p.portrait.regionId) : null)

/** An elbow from (x1, y1) down to (x2, y2) with rounded corners. */
export function elbow(x1: number, y1: number, x2: number, y2: number, radius = 10) {
  const mid = (y1 + y2) / 2
  const dx = x2 - x1
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(y2 - y1) / 2)
  if (r < 0.5) return `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`
  const sx = Math.sign(dx)
  return [
    `M ${x1} ${y1}`,
    `V ${mid - r}`,
    `Q ${x1} ${mid} ${x1 + sx * r} ${mid}`,
    `H ${x2 - sx * r}`,
    `Q ${x2} ${mid} ${x2} ${mid + r}`,
    `V ${y2}`,
  ].join(' ')
}
