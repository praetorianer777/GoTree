import type { Edge, EdgeProps } from '@xyflow/react'
import { branchEnds, branchPath, LEAF_PATH, leafColors, leavesAlong } from './branches'

export interface BranchEdgeData extends Record<string, unknown> {
  /** The vertical centre of the root person, where the trunk is thickest. */
  rootY: number
}

/** A connector drawn as a tapering branch with a few leaves; decoration only. */
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
  const { from, to, wFrom, wTo } = branchEnds(
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
    source.startsWith('f'),
    target.startsWith('f'),
    data?.rootY ?? 0,
  )
  return (
    <g aria-hidden="true">
      <path d={branchPath(from, to, wFrom, wTo)} className="fill-[#7a5534] dark:fill-[#a98260]" />
      {leavesAlong(from, to, id, (wFrom + wTo) / 2).map((l) => (
        <path
          key={`${l.x},${l.y}`}
          d={LEAF_PATH}
          transform={`translate(${l.x} ${l.y}) rotate(${l.angle}) scale(${l.scale})`}
          fill={leafColors[l.shade]}
        />
      ))}
    </g>
  )
}
