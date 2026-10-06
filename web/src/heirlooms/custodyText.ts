import type { TFunction } from 'i18next'
import type { Custody } from '../api/types'

/** "1920 – 1965", "since 1965" or "" for a custody entry. */
export function custodyPeriod(t: TFunction, c: Pick<Custody, 'fromDate' | 'toDate'>): string {
  if (c.fromDate && c.toDate) return t('heirloom.period', { from: c.fromDate, to: c.toDate })
  if (c.fromDate) return t('heirloom.since', { from: c.fromDate })
  if (c.toDate) return t('heirloom.until', { to: c.toDate })
  return ''
}
