import { BranchEdge } from './BranchEdge'
import { JunctionNode, PersonNode, RepeatNode, UnknownNode } from './nodes'

export const nodeTypes = { person: PersonNode, junction: JunctionNode, unknown: UnknownNode, repeat: RepeatNode }
export const edgeTypes = { branch: BranchEdge }

/** How the chart looks: branches and leaves, or plain connector lines. */
export type TreeLook = 'leafy' | 'plain'
