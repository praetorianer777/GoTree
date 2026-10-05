import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getChecks } from '../api/endpoints'
import type { CheckRule } from '../api/types'
import { PageHeading } from '../components/PageHeading'
import { DateNormalizer } from '../quality/DateNormalizer'
import { FindingList } from '../quality/FindingList'

export function QualityPage() {
  const { t } = useTranslation()
  const findingsId = useId()
  const datesId = useId()
  const [rule, setRule] = useState<CheckRule | ''>('')
  const checks = useQuery({ queryKey: ['checks', 'all'], queryFn: ({ signal }) => getChecks(null, signal) })
  const findings = checks.data?.findings ?? []
  const rules = [...new Set(findings.map((f) => f.rule))]
  const shown = rule ? findings.filter((f) => f.rule === rule) : findings

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <PageHeading title={t('nav.quality')}>{t('nav.quality')}</PageHeading>
        <p className="text-slate-700 dark:text-slate-300">{t('quality.intro')}</p>
      </div>

      <section aria-labelledby={findingsId} className="space-y-3">
        <h2 id={findingsId} className="text-xl font-semibold">
          {t('quality.findings')}
        </h2>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
          {checks.isPending
            ? t('app.loading')
            : checks.isError
              ? t('common.loadFailed')
              : findings.length === 0
                ? t('quality.noFindings')
                : t('quality.findingCount', { count: findings.length })}
        </p>
        {rules.length > 1 && (
          <div>
            <label htmlFor="quality-rule" className="block text-sm font-medium">
              {t('quality.filterLabel')}
            </label>
            <select
              id="quality-rule"
              value={rule}
              onChange={(e) => setRule(e.target.value as CheckRule | '')}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-base sm:w-auto dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">{t('quality.filterAll')}</option>
              {rules.map((r) => (
                <option key={r} value={r}>
                  {t(`quality.ruleName.${r}`)} ({findings.filter((f) => f.rule === r).length})
                </option>
              ))}
            </select>
          </div>
        )}
        {checks.data && shown.length > 0 && <FindingList report={{ ...checks.data, findings: shown }} />}
      </section>

      <section aria-labelledby={datesId} className="space-y-3">
        <h2 id={datesId} className="text-xl font-semibold">
          {t('quality.dates')}
        </h2>
        <DateNormalizer />
      </section>
    </div>
  )
}
