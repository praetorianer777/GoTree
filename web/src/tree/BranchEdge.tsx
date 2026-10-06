import type { Edge, EdgeProps } from '@xyflow/react'
import { useMemo } from 'react'
import { useDark } from '../lib/theme'
import { branchEnds, darkPalette, growBranch, lightPalette } from './branches'
import { BranchArt } from './Nature'

export interface BranchEdgeData extends Record<string, unknown> {
  /** The vertical centre of the root person, where the trunk is thickest. */
  rootY: number
}

/** A connector drawn as a growing branch; decoration only. */
export function BranchEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<Edge<BranchEdgeData>>) {
  const dark = useDark()
  const rootY = data?.rootY ?? 0
  const shape = useMemo(() => {
    const { from, to, wFrom, wTo } = branchEnds(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      source.startsWith('f'),
      target.startsWith('f'),
      rootY,
    )
    return growBranch(from, to, wFrom, wTo, id)
  }, [id, source, target, sourceX, sourceY, targetX, targetY, rootY])
  return <BranchArt shape={shape} palette={dark ? darkPalette : lightPalette} />
}
