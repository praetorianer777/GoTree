import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import type { PersonRef } from '../api/types'
import { fullName, lifespan } from '../lib/people'
import { Avatar } from '../media/Avatar'

export interface PersonNodeData extends Record<string, unknown> {
  person: PersonRef
  root: boolean
  selected: boolean
  tabbable: boolean
  onSelect: (id: number) => void
  onCenter: (id: number) => void
  onKey: (id: number, e: React.KeyboardEvent<HTMLButtonElement>) => void
}

export interface RepeatNodeData extends Record<string, unknown> {
  person: PersonRef
  onJump: (id: number) => void
}

const hidden = { opacity: 0, pointerEvents: 'none' as const }

// React Flow disables pointer events on nodes it considers inert (we turn
// off its own selection); the cards are buttons and must stay clickable.
const interactive = { pointerEvents: 'auto' as const }

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} style={hidden} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={hidden} />
    </>
  )
}

const sexMark: Record<string, string> = { M: '♂', F: '♀', X: '⚧', U: '' }

export function PersonNode({ data }: NodeProps<Node<PersonNodeData>>) {
  const { t } = useTranslation()
  const p = data.person
  const name = fullName(p) ?? t('person.unknown')
  const years = lifespan(p)
  return (
    <>
      <Handles />
      <button
        type="button"
        data-tree-person={p.id}
        tabIndex={data.tabbable ? 0 : -1}
        aria-pressed={data.selected}
        aria-current={data.root ? 'true' : undefined}
        onClick={() => data.onSelect(p.id)}
        onDoubleClick={() => data.onCenter(p.id)}
        onKeyDown={(e) => data.onKey(p.id, e)}
        style={interactive}
        className={[
          'nodrag flex h-16 w-[180px] items-center gap-2 rounded-xl border-2 bg-white px-2 text-left shadow-sm dark:bg-slate-900',
          data.selected
            ? 'border-brand-700 ring-2 ring-brand-500 dark:border-brand-100'
            : data.root
              ? 'border-brand-700 dark:border-brand-100'
              : 'border-slate-300 dark:border-slate-600',
          p.sex === 'F' ? 'border-l-8 border-l-rose-500' : p.sex === 'M' ? 'border-l-8 border-l-sky-600' : '',
        ].join(' ')}
      >
        <Avatar person={p} size={40} />
        <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {sexMark[p.sex] && (
            <span aria-hidden="true" className="text-slate-600 dark:text-slate-300">
              {sexMark[p.sex]}
            </span>
          )}
          <span className="truncate">{name}</span>
        </span>
        <span className="truncate text-xs text-slate-600 dark:text-slate-300">
          {years}
          <span className="sr-only">
            {', '}
            {t(`sex.${p.sex}`)}
            {data.root ? `, ${t('tree.rootPerson')}` : ''}
          </span>
        </span>
        </span>
      </button>
    </>
  )
}

export function JunctionNode() {
  return (
    <>
      <Handles />
      <div aria-hidden="true" className="size-3 rounded-full bg-slate-500 dark:bg-slate-400" />
    </>
  )
}

export function UnknownNode() {
  const { t } = useTranslation()
  return (
    <>
      <Handles />
      <div className="flex h-12 w-[180px] items-center justify-center rounded-xl border-2 border-dashed border-slate-400 text-sm italic text-slate-600 dark:border-slate-600 dark:text-slate-300">
        {t('person.unknownParent')}
      </div>
    </>
  )
}

export function RepeatNode({ data }: NodeProps<Node<RepeatNodeData>>) {
  const { t } = useTranslation()
  const name = fullName(data.person) ?? t('person.unknown')
  return (
    <>
      <Handles />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => data.onJump(data.person.id)}
        style={interactive}
        className="nodrag flex h-12 w-[132px] items-center rounded-xl border-2 border-dashed border-brand-500 bg-white px-2 text-left text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <span className="line-clamp-2">
          <span aria-hidden="true">↺ </span>
          {t('tree.repeat', { name })}
        </span>
      </button>
    </>
  )
}

