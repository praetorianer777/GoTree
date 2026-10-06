import { JunctionNode, PersonNode, RepeatNode, UnknownNode } from './nodes'
import { VineEdge } from './VineEdge'

export const nodeTypes = { person: PersonNode, junction: JunctionNode, unknown: UnknownNode, repeat: RepeatNode }
export const edgeTypes = { vine: VineEdge }

/** How the chart looks: vines between parchment cards, or plain connector lines. */
export type TreeLook = 'leafy' | 'plain'
