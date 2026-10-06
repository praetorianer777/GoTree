import { useTranslation } from 'react-i18next'
import type { CheckReport, Finding } from '../api/types'
import { fullName } from '../lib/people'

/** The finding as a sentence, with the people named. */
export function useFindingText() {
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
