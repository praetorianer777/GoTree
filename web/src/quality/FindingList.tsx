import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { CheckReport, Finding } from '../api/types'
import { fullName } from '../lib/people'

/** The finding as a sentence, with the people named. */
function useFindingText() {
  const { t } = useTranslation()
  return (f: Finding, persons: CheckReport['persons']) => {
    const name = (id?: number) => (id && persons[id] ? fullName(persons[id]) : null) ?? t('person.unknown')
    return t(`quality.rule.${f.rule}`, {
      person: name(f.personId),
      other: name(f.otherPersonId),
      event: f.eventType ? t(`eventType.${f.eventType}`, { defaultValue: f.eventType }) : '',
      years: f.years,
    })
  }
}

interface Props {
  report: CheckReport
  /** Leaves out the link to this person, e.g. on their own page. */
  currentPersonId?: number
}

export function FindingList({ report, currentPersonId }: Props) {
  const { t } = useTranslation()
  const text = useFindingText()
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {report.findings.map((f, i) => {
        const people = [f.personId, f.otherPersonId].filter(
          (id): id is number => id !== undefined && id !== currentPersonId,
        )
        return (
          <li key={`${f.rule}-${f.personId}-${f.eventId ?? f.otherPersonId ?? i}`} className="flex gap-3 px-4 py-3">
            <span
              className={[
                'mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                f.severity === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
              ].join(' ')}
            >
              {t(`quality.severity_${f.severity}`)}
            </span>
            <div className="min-w-0">
              <p>{text(f, report.persons)}</p>
              {people.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  {people.map((id) => (
                    <Link key={id} to={`/people/${id}`} className="text-brand-700 underline dark:text-brand-100">
                      {fullName(report.persons[id] ?? { givenNames: '', surname: '' }) ?? t('person.unknown')}
                    </Link>
                  ))}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
