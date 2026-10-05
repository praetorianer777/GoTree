import { useTranslation } from 'react-i18next'
import { listPersons } from '../api/endpoints'
import type { PersonRef } from '../api/types'
import { SearchSelect } from '../components/SearchSelect'
import { fullName, lifespan } from '../lib/people'

interface Props {
  label: string
  value: PersonRef | null
  onChange: (p: PersonRef | null) => void
  error?: string
  /** People that must not be offered, e.g. the person being edited. */
  exclude?: number[]
}

export function PersonPicker({ label, value, onChange, error, exclude = [] }: Props) {
  const { t } = useTranslation()
  const name = (p: PersonRef) => fullName(p) ?? t('person.unknown')
  return (
    <SearchSelect<PersonRef>
      label={label}
      hint={t('person.pickerHint')}
      queryKey="persons"
      search={async (q, signal) => (await listPersons(q, 20, 0, signal)).items.filter((p) => !exclude.includes(p.id))}
      getKey={(p) => p.id}
      itemText={(p) => [name(p), lifespan(p)].filter(Boolean).join(', ')}
      renderItem={(p) => (
        <>
          <span className="font-medium">{name(p)}</span>
          {lifespan(p) && <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{lifespan(p)}</span>}
        </>
      )}
      value={value}
      onChange={onChange}
      error={error}
    />
  )
}
