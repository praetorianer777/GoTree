import { useQuery } from '@tanstack/react-query'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getStats } from '../api/endpoints'
import type { Average, NameCount } from '../api/types'
import { PageHeading } from '../components/PageHeading'

/** A bar beside the number it shows; the number is what assistive tech reads. */
function Bar({
  value,
  max,
  children,
  tone = 'brand',
}: {
  value: number
  max: number
  children: ReactNode
  tone?: 'brand' | 'rose' | 'slate'
}) {
  const color = { brand: 'bg-brand-600', rose: 'bg-rose-600', slate: 'bg-slate-500' }[tone]
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="block h-3 min-w-0 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={`block h-3 rounded-full ${color}`}
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </span>
      <span className="w-20 shrink-0 text-right tabular-nums">{children}</span>
    </div>
  )
}

function Figure({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <figure className="space-y-2">
        <figcaption className="text-slate-700 dark:text-slate-300">{caption}</figcaption>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be reachable by keyboard (WCAG 2.1.1) */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- same reason */}
        <div className="overflow-x-auto" tabIndex={0} role="group" aria-labelledby={id}>
          {children}
        </div>
      </figure>
    </section>
  )
}

const th = 'px-2 py-1 text-left text-sm font-semibold'
const td = 'px-2 py-1 align-middle'

export function StatsPage() {
  const { t } = useTranslation()
  const stats = useQuery({ queryKey: ['stats'], queryFn: ({ signal }) => getStats(signal) })
  if (stats.isPending) return <p role="status">{t('app.loading')}</p>
  if (stats.isError) return <p role="alert">{t('common.loadFailed')}</p>
  const s = stats.data
  const empty = <p className="text-slate-600 dark:text-slate-400">{t('stats.empty')}</p>
  const maxAge = Math.max(0, ...s.lifespans.map((l) => l.max))
  const maxMarriage = Math.max(
    0,
    ...s.marriages.flatMap((m) => [m.firstMen.average, m.firstWomen.average, m.later.average]),
  )
  const maxFamilies = Math.max(0, ...s.childrenHistogram)
  const age = (a: Average) => (a.count === 0 ? '–' : t('stats.ageCount', { age: a.average, count: a.count }))

  return (
    <div className="max-w-4xl space-y-10">
      <div className="space-y-3">
        <PageHeading title={t('nav.stats')}>{t('nav.stats')}</PageHeading>
        <p className="text-slate-700 dark:text-slate-300">{t('stats.intro')}</p>
        <p>{t('stats.summary', { persons: s.persons, families: s.families, withLifespan: s.withLifespan })}</p>
      </div>

      <Figure title={t('stats.lifespan')} caption={t('stats.lifespanCaption')}>
        {s.lifespans.length === 0 ? (
          empty
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className={th}>
                  {t('stats.decade')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.averageAge')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.range')}
                </th>
                <th scope="col" className={`${th} text-right`}>
                  {t('stats.people')}
                </th>
              </tr>
            </thead>
            <tbody>
              {s.lifespans.map((l) => (
                <tr key={l.decade} className="border-t border-slate-200 dark:border-slate-800">
                  <th scope="row" className={`${td} font-medium`}>
                    {t('stats.decadeValue', { decade: l.decade })}
                  </th>
                  <td className={`${td} w-1/2`}>
                    <Bar value={l.average} max={maxAge}>
                      {l.average}
                    </Bar>
                  </td>
                  <td className={td}>{t('stats.rangeValue', { min: l.min, max: l.max })}</td>
                  <td className={`${td} text-right tabular-nums`}>{l.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Figure>

      <Figure title={t('stats.marriage')} caption={t('stats.marriageCaption')}>
        {s.marriages.length === 0 ? (
          empty
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className={th}>
                  {t('stats.decade')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.firstMen')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.firstWomen')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.later')}
                </th>
              </tr>
            </thead>
            <tbody>
              {s.marriages.map((m) => (
                <tr key={m.decade} className="border-t border-slate-200 dark:border-slate-800">
                  <th scope="row" className={`${td} font-medium`}>
                    {t('stats.decadeValue', { decade: m.decade })}
                  </th>
                  <td className={td}>
                    <Bar value={m.firstMen.average} max={maxMarriage}>
                      {age(m.firstMen)}
                    </Bar>
                  </td>
                  <td className={td}>
                    <Bar value={m.firstWomen.average} max={maxMarriage} tone="rose">
                      {age(m.firstWomen)}
                    </Bar>
                  </td>
                  <td className={td}>
                    <Bar value={m.later.average} max={maxMarriage} tone="slate">
                      {age(m.later)}
                    </Bar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Figure>

      <Figure title={t('stats.children')} caption={t('stats.childrenCaption', { average: s.childrenAverage })}>
        {s.families === 0 ? (
          empty
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className={th}>
                  {t('stats.childCount')}
                </th>
                <th scope="col" className={th}>
                  {t('stats.families')}
                </th>
              </tr>
            </thead>
            <tbody>
              {s.childrenHistogram.map((n, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: the index is the number of children
                <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                  <th scope="row" className={`${td} font-medium`}>
                    {i === s.childrenHistogram.length - 1 ? t('stats.childCountMore', { count: i }) : i}
                  </th>
                  <td className={`${td} w-3/4`}>
                    <Bar value={n} max={maxFamilies}>
                      {n}
                    </Bar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Figure>

      <Figure title={t('stats.surnames')} caption={t('stats.surnamesCaption')}>
        {s.surnames.length === 0 ? empty : <WordCloud names={s.surnames} />}
      </Figure>

      <Figure title={t('stats.givenNames')} caption={t('stats.givenNamesCaption')}>
        {s.givenNames.length === 0 ? (
          empty
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">{t('stats.overall')}</h3>
            <ol className="flex flex-wrap gap-2">
              {s.givenNames.map((n) => (
                <li key={n.name} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                  {n.name} <span className="text-sm text-slate-600 dark:text-slate-400">({n.count})</span>
                </li>
              ))}
            </ol>
            {s.givenNameTrends.length > 0 && (
              <>
                <h3 className="font-semibold">{t('stats.trends')}</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>
                        {t('stats.decade')}
                      </th>
                      <th scope="col" className={th}>
                        {t('stats.men')}
                      </th>
                      <th scope="col" className={th}>
                        {t('stats.women')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.givenNameTrends.map((d) => (
                      <tr key={d.decade} className="border-t border-slate-200 dark:border-slate-800">
                        <th scope="row" className={`${td} font-medium`}>
                          {t('stats.decadeValue', { decade: d.decade })}
                        </th>
                        <td className={td}>{d.men.map((n) => `${n.name} (${n.count})`).join(', ') || '–'}</td>
                        <td className={td}>{d.women.map((n) => `${n.name} (${n.count})`).join(', ') || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </Figure>
    </div>
  )
}

/**
 * Surnames sized by frequency, in alphabetical order so a name is easy to
 * find; each entry also says its count, so size is not the only cue.
 */
function WordCloud({ names }: { names: NameCount[] }) {
  const { t } = useTranslation()
  const counts = names.map((n) => n.count)
  const lo = Math.min(...counts)
  const hi = Math.max(...counts)
  const size = (c: number) => (hi === lo ? 1.25 : 0.875 + ((c - lo) / (hi - lo)) * 1.625)
  return (
    <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {[...names]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((n) => (
          <li
            key={n.name}
            style={{ fontSize: `${size(n.count)}rem` }}
            className="font-medium text-brand-700 dark:text-brand-100"
          >
            <span aria-hidden="true">{n.name}</span>
            <span className="sr-only">{t('stats.surnameEntry', { name: n.name, count: n.count })}</span>
          </li>
        ))}
    </ul>
  )
}
