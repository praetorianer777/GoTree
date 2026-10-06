import { BranchEdge } from './BranchEdge'
import { CanopyNode, JunctionNode, PersonNode, RepeatNode, TrunkNode, UnknownNode } from './nodes'

export const nodeTypes = { person: PersonNode, junction: JunctionNode, unknown: UnknownNode, repeat: RepeatNode, trunk: TrunkNode, canopy: CanopyNode }
export const edgeTypes = { branch: BranchEdge }

/** How the chart looks: branches and leaves, or plain connector lines. */
export type TreeLook = 'leafy' | 'plain'
