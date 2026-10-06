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
