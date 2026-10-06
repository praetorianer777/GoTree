import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { listHeirlooms } from '../api/endpoints'
import type { PersonRef } from '../api/types'
import { Button } from '../components/Button'
import { HeirloomDialog } from './HeirloomDialog'

/** The heirlooms a person held, for their page. */
export function PersonHeirlooms({ person }: { person: PersonRef }) {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const list = useQuery({
    queryKey: ['heirlooms', 'person', person.id],
    queryFn: ({ signal }) => listHeirlooms({ person: person.id }, signal),
  })
  return (
    <div className="space-y-3">
      {list.data && list.data.length === 0 && <p className="text-slate-600 dark:text-slate-400">{t('heirloom.personNone')}</p>}
      {list.data && list.data.length > 0 && (
        <ul className="space-y-1">
          {list.data.map((h) => (
            <li key={h.id}>
              <Link to={`/heirlooms/${h.id}`} className="inline-flex min-h-11 items-center font-medium text-brand-700 underline dark:text-brand-100">
                {h.name}
              </Link>
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{t(`heirloom.kinds.${h.kind}`)}</span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setCreating(true)}>
        + {t('heirloom.new')}
      </Button>
      {creating && <HeirloomDialog holder={person} onClose={() => setCreating(false)} />}
    </div>
  )
}
