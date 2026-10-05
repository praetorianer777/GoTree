import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getPerson } from '../api/endpoints'
import type { PersonRef, Relation } from '../api/types'
import { Button } from '../components/Button'
import { fullName, lifespan } from '../lib/people'
import { RelativeDialog } from '../people/RelativeDialog'

interface Props {
  person: PersonRef
  isRoot: boolean
  onCenter: (id: number) => void
  onClose: () => void
}

/** Actions for the person selected in the chart. */
export function PersonPanel({ person, isRoot, onCenter, onClose }: Props) {
  const { t } = useTranslation()
  const [relation, setRelation] = useState<Relation | null>(null)
  const detail = useQuery({ queryKey: ['person', person.id], queryFn: ({ signal }) => getPerson(person.id, signal) })
  const name = fullName(person) ?? t('person.unknown')

  return (
    <section aria-labelledby="tree-panel-title" className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="tree-panel-title" className="text-lg font-semibold">
            {name}
          </h2>
          {lifespan(person) && <p className="text-sm text-slate-600 dark:text-slate-400">{lifespan(person)}</p>}
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
          <span className="sr-only">: {name}</span>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {!isRoot && <Button onClick={() => onCenter(person.id)}>{t('tree.centerHere')}</Button>}
        <Link
          to={`/people/${person.id}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 px-4 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          {t('tree.openPage')}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('tree.addRelative')}>
        {(['parent', 'partner', 'child', 'sibling'] as const).map((r) => (
          <Button key={r} variant="secondary" disabled={!detail.data} onClick={() => setRelation(r)}>
            + {t(`relative.${r}`)}
          </Button>
        ))}
      </div>
      {detail.data && relation && (
        <RelativeDialog open anchor={detail.data} relation={relation} onClose={() => setRelation(null)} onSaved={() => setRelation(null)} />
      )}
    </section>
  )
}
