import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { LayoutNode, TreeLayout } from './layout'
import type { TreeIndex } from './model'
import { nodeTypes } from './nodeTypes'
import type { PersonNodeData, RepeatNodeData } from './nodes'

interface Props {
  layout: TreeLayout
  index: TreeIndex
  selectedId: number | null
  onSelect: (id: number) => void
  onCenter: (id: number) => void
}

export function TreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

const center = (n: LayoutNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })

/** The nearest person card in an arrow key's direction, preferring the same column or row. */
function neighbour(nodes: LayoutNode[], from: LayoutNode, key: string): LayoutNode | undefined {
  const c = center(from)
  let best: LayoutNode | undefined
  let bestScore = Infinity
  for (const n of nodes) {
    if (n.kind !== 'person' || n.id === from.id) continue
    const d = center(n)
    const dx = d.x - c.x
    const dy = d.y - c.y
    let ok: boolean
    let score: number
    switch (key) {
      case 'ArrowUp':
        ok = dy < -1
        score = -dy * 1000 + Math.abs(dx)
        break
      case 'ArrowDown':
        ok = dy > 1
        score = dy * 1000 + Math.abs(dx)
        break
      case 'ArrowLeft':
        ok = Math.abs(dy) < 1 && dx < 0
        score = -dx
        break
      default:
        ok = Math.abs(dy) < 1 && dx > 0
        score = dx
    }
    if (ok && score < bestScore) {
      best = n
      bestScore = score
    }
  }
  return best
}

function Canvas({ layout, index, selectedId, onSelect, onCenter }: Props) {
  const { t } = useTranslation()
  const flow = useReactFlow()
  const helpId = useId()
  const rootId = index.rootId
  const [focusId, setFocusId] = useState<number>(rootId)
  const [prevRoot, setPrevRoot] = useState(rootId)
  // A new root moves the single tab stop back to it.
  if (prevRoot !== rootId) {
    setPrevRoot(rootId)
    setFocusId(rootId)
  }

  const byPerson = useMemo(
    () => new Map(layout.nodes.filter((n) => n.kind === 'person').map((n) => [n.personId!, n])),
    [layout],
  )

  const reveal = (id: number, focus: boolean) => {
    const n = byPerson.get(id)
    if (!n) return
    const c = center(n)
    void flow.setCenter(c.x, c.y, { zoom: Math.max(flow.getZoom(), 0.8), duration: 250 })
    setFocusId(id)
    if (focus) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-tree-person="${id}"]`)?.focus())
  }

  const onKey = (id: number, e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.key.startsWith('Arrow')) return
    const from = byPerson.get(id)
    const to = from && neighbour(layout.nodes, from, e.key)
    e.preventDefault()
    if (to) reveal(to.personId!, true)
  }

  const nodes: Node[] = useMemo(
    () =>
      layout.nodes.map((n): Node => {
        const base = { id: n.id, position: { x: n.x, y: n.y }, width: n.w, height: n.h, type: n.kind }
        if (n.kind === 'person') {
          const data: PersonNodeData = {
            person: index.persons.get(n.personId!)!,
            root: n.personId === rootId,
            selected: n.personId === selectedId,
            tabbable: n.personId === focusId,
            onSelect: (id) => {
              setFocusId(id)
              onSelect(id)
            },
            onCenter,
            onKey,
          }
          return { ...base, data }
        }
        if (n.kind === 'repeat') {
          const data: RepeatNodeData = { person: index.persons.get(n.personId!)!, onJump: (id) => reveal(id, true) }
          return { ...base, data }
        }
        return { ...base, data: {} }
      }),
    // onKey and reveal only read layout-derived values that are deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, index, selectedId, focusId, rootId, onSelect, onCenter],
  )
  const edges: Edge[] = useMemo(
    () => layout.edges.map((e) => ({ ...e, type: 'smoothstep', focusable: false, style: { strokeWidth: 2 } })),
    [layout],
  )

  // Re-frame the chart whenever a different tree is shown.
  useEffect(() => {
    const id = requestAnimationFrame(() => void flow.fitView({ padding: 0.15, maxZoom: 1, duration: 200 }))
    return () => cancelAnimationFrame(id)
  }, [layout, flow])

  return (
    <div role="group" aria-label={t('tree.chartLabel')} aria-describedby={helpId} className="size-full">
      <p id={helpId} className="sr-only">
        {t('tree.chartHelp')}
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={2}
        fitView
        onlyRenderVisibleElements={layout.nodes.length > 300}
        colorMode="system"
        disableKeyboardA11y
      >
        <Background gap={24} />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap className="!hidden md:!block" pannable zoomable ariaLabel={t('tree.minimap')} />
      </ReactFlow>
    </div>
  )
}
