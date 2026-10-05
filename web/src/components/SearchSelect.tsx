import { useQuery } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounced } from '../hooks/useDebounced'
import { Button } from './Button'

interface Props<T> {
  label: string
  /** Query key prefix; the search text is appended. */
  queryKey: string
  search: (q: string, signal: AbortSignal) => Promise<T[]>
  getKey: (item: T) => number
  renderItem: (item: T) => ReactNode
  /** Plain-text name of an item, used for the selected state. */
  itemText: (item: T) => string
  value: T | null
  onChange: (item: T | null) => void
  hint?: string
  error?: string
  /** Rendered below the results, e.g. a "create new" action. */
  footer?: (query: string) => ReactNode
}

/**
 * Pick one item by searching. Deliberately not an ARIA combobox: a search
 * field followed by a list of buttons works the same with mouse, touch,
 * keyboard and screen readers, with nothing to get wrong.
 */
export function SearchSelect<T>(props: Props<T>) {
  const { label, queryKey, search, getKey, renderItem, itemText, value, onChange, hint, error, footer } = props
  const { t } = useTranslation()
  const id = useId()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query.trim())
  const results = useQuery({
    queryKey: [queryKey, 'search', debounced],
    queryFn: ({ signal }) => search(debounced, signal),
    // Results appear once something is typed; a full list up front only
    // pushes the rest of the form out of view.
    enabled: value === null && debounced !== '',
  })

  if (value !== null) {
    return (
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <div className="mt-1 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-1 dark:border-slate-700">
          <span className="min-w-0 truncate">{itemText(value)}</span>
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            {t('common.change')}
            <span className="sr-only">: {label}</span>
          </Button>
        </div>
        {error && <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  const items = debounced === '' ? [] : (results.data ?? [])
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      <input
        id={id}
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-describedby={[hint && `${id}-hint`, `${id}-count`, error && `${id}-error`].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-900"
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <p id={`${id}-count`} role="status" className="sr-only">
        {debounced === '' ? '' : results.isFetching ? t('common.searching') : t('common.resultCount', { count: items.length })}
      </p>
      {items.length > 0 && (
        <ul className="mt-2 max-h-60 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-300 dark:divide-slate-800 dark:border-slate-700">
          {items.map((item) => (
            <li key={getKey(item)}>
              <button
                type="button"
                onClick={() => {
                  onChange(item)
                  setQuery('')
                }}
                className="block min-h-11 w-full px-3 py-2 text-left hover:bg-brand-50 dark:hover:bg-slate-800"
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {footer?.(query.trim())}
    </div>
  )
}
