import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { CitationRef, NewCitation, Source } from '../api/types'
import { Button } from '../components/Button'
import { SelectField } from '../components/Field'
import { TextField } from '../components/TextField'
import { qualityKey } from './quality'
import { SourcePicker } from './SourcePicker'

export interface PendingCitation extends NewCitation {
  sourceTitle: string
}

interface Props {
  /** Citations already attached (empty for a new record). */
  existing: CitationRef[]
  removed: number[]
  onRemovedChange: (ids: number[]) => void
  added: PendingCitation[]
  onAddedChange: (cits: PendingCitation[]) => void
  error?: string
}

/**
 * The "Sources" part of a form. Changes are only collected here and sent
 * with the form, so Cancel really cancels.
 */
export function CitationEditor({ existing, removed, onRemovedChange, added, onAddedChange, error }: Props) {
  const { t } = useTranslation()
  const headingId = useId()
  const [source, setSource] = useState<Source | null>(null)
  const [page, setPage] = useState('')
  const [quality, setQuality] = useState('')

  const shown = existing.filter((c) => !removed.includes(c.citationId))
  const add = () => {
    if (!source) return
    onAddedChange([...added, { sourceId: source.id, sourceTitle: source.title, page, quality: quality === '' ? null : Number(quality), text: '' }])
    setSource(null)
    setPage('')
    setQuality('')
  }

  return (
    <fieldset aria-labelledby={headingId} className="space-y-3">
      <legend id={headingId} className="text-sm font-semibold">
        {t('citation.sources')}
      </legend>
      {shown.length + added.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{t('citation.none')}</p>}
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.citationId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1 dark:border-slate-800">
            <CitationText citation={c} />
            <Button type="button" variant="ghost" onClick={() => onRemovedChange([...removed, c.citationId])}>
              {t('common.remove')}
              <span className="sr-only">: {c.sourceTitle}</span>
            </Button>
          </li>
        ))}
        {added.map((c, i) => (
          <li key={`new-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-brand-500 px-3 py-1">
            <span>
              {c.sourceTitle}
              {c.page && <span className="text-slate-600 dark:text-slate-400">, {c.page}</span>}
              <span className="ml-2 text-xs font-semibold text-brand-700 dark:text-brand-100">{t('citation.unsaved')}</span>
            </span>
            <Button type="button" variant="ghost" onClick={() => onAddedChange(added.filter((_, j) => j !== i))}>
              {t('common.remove')}
              <span className="sr-only">: {c.sourceTitle}</span>
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>}

      <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <SourcePicker value={source} onChange={setSource} />
        {source && (
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <TextField label={t('citation.page')} hint={t('citation.pageHint')} value={page} onChange={(e) => setPage(e.target.value)} />
            <SelectField label={t('citation.quality')} value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">{t('citation.qualityUnknown')}</option>
              {[3, 2, 1, 0].map((q) => (
                <option key={q} value={q}>
                  {t(qualityKey(q))}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <Button type="button" variant="secondary" disabled={!source} onClick={add}>
          + {t('citation.add')}
        </Button>
      </div>
    </fieldset>
  )
}

export function CitationText({ citation }: { citation: CitationRef }) {
  const { t } = useTranslation()
  return (
    <span>
      <Link to={`/sources/${citation.sourceId}`} className="text-brand-700 underline underline-offset-4 dark:text-brand-100">
        {citation.sourceTitle}
      </Link>
      {citation.page && <span className="text-slate-600 dark:text-slate-400">, {citation.page}</span>}
      {citation.field && (
        <span className="text-slate-600 dark:text-slate-400">
          {' '}
          ({t('citation.supports', { field: t(`citation.field.${citation.field}` as 'citation.field.date', { defaultValue: citation.field }) })})
        </span>
      )}
      {citation.quality !== null && (
        <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">({t(qualityKey(citation.quality))})</span>
      )}
    </span>
  )
}
