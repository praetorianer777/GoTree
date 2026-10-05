import type { TFunction } from 'i18next'
import type { Family, PersonRef } from '../api/types'
import { fullName } from '../lib/people'

const name = (t: TFunction, p: PersonRef | null) => (p ? (fullName(p) ?? t('person.unknown')) : t('person.unknownParent'))

/** "Hans Weber & Maria Weber" for a parent family. */
export function parentsLabel(t: TFunction, f: Family): string {
  return `${name(t, f.partner1)} & ${name(t, f.partner2)}`
}

/** "with Eva Weber", or "other parent unknown", seen from personId. */
export function partnerLabel(t: TFunction, f: Family, personId: number): string {
  const other = f.partner1?.id === personId ? f.partner2 : f.partner1
  return other ? t('family.with', { name: name(t, other) }) : t('family.otherParentUnknown')
}

export function otherPartner(f: Family, personId: number): PersonRef | null {
  return f.partner1?.id === personId ? f.partner2 : f.partner1
}
