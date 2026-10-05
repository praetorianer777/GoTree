import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { listSources } from '../api/endpoints'
import { Button } from '../components/Button'
import { PageHeading } from '../components/PageHeading'
import { useDebounced } from '../hooks/useDebounced'
import { SourceDialog } from '../sources/SourceDialog'

export function SourcesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const q = useDebounced(query.trim())
  const sources = useQuery({ queryKey: ['sources', 'list', q], queryFn: ({ signal }) => listSources(q, signal) })
  const items = sources.data ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeading title={t('nav.sources')}>{t('nav.sources')}</PageHeading>
        <Button onClick={() => setCreating(true)}>+ {t('source.new')}</Button>
      </div>
      <p className="text-slate-700 dark:text-slate-300">{t('source.intro')}</p>
      <search>
        <label htmlFor="sources-search" className="block text-sm font-medium">
          {t('source.search')}
        </label>
        <input
          id="sources-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="sources-status"
          className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-900"
        />
      </search>
      <p id="sources-status" role="status" className="text-sm text-slate-600 dark:text-slate-400">
        {sources.isPending ? t('common.searching') : sources.isError ? t('common.loadFailed') : t('source.count', { count: items.length })}
      </p>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {items.map((s) => (
            <li key={s.id}>
              <Link to={`/sources/${s.id}`} className="block min-h-14 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                <span className="font-medium">{s.title}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">
                  {[s.author, s.repository?.name, t('source.citationCount', { count: s.citationCount })].filter(Boolean).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SourceDialog open={creating} onClose={() => setCreating(false)} onSaved={(s) => navigate(`/sources/${s.id}`)} />
    </div>
  )
}
