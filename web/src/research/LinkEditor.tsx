import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ResearchEntity, ResearchLink } from '../api/types'
import { Button } from '../components/Button'
import { fullName } from '../lib/people'
import { PersonPicker } from '../people/PersonPicker'
import { PlaceField } from '../people/PlaceField'
import { SourcePicker } from '../sources/SourcePicker'

interface Props {
  value: ResearchLink[]
  onChange: (links: ResearchLink[]) => void
}

/** The people, sources and places a task or log entry is about. */
export function LinkEditor({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState<ResearchEntity | null>(null)
  const add = (entityType: ResearchEntity, entityId: number, label: string) => {
    if (!value.some((l) => l.entityType === entityType && l.entityId === entityId)) {
      onChange([...value, { entityType, entityId, label }])
    }
    setAdding(null)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t('research.links')}</legend>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((l) => (
            <li
              key={`${l.entityType}-${l.entityId}`}
              className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-3 text-sm dark:bg-slate-800"
            >
              <span className="sr-only">{t(`research.entity_${l.entityType}`)}: </span>
              {l.label}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== l))}
                className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">{t('research.removeLink', { label: l.label })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding === 'person' && (
        <PersonPicker
          label={t('research.linkPerson')}
          value={null}
          onChange={(p) => p && add('person', p.id, fullName(p) ?? t('person.unknown'))}
        />
      )}
      {adding === 'source' && <SourcePicker value={null} onChange={(s) => s && add('source', s.id, s.title)} />}
      {adding === 'place' && <PlaceField value={null} onChange={(p) => p && add('place', p.id, p.fullName)} />}
      <div className="flex flex-wrap gap-2">
        {(['person', 'source', 'place'] as const).map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="secondary"
            aria-pressed={adding === kind}
            onClick={() => setAdding(adding === kind ? null : kind)}
          >
            + {t(`research.link${kind === 'person' ? 'Person' : kind === 'source' ? 'Source' : 'Place'}`)}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}
