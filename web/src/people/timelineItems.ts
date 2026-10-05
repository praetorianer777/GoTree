import type { Family, LifeEvent } from '../api/types'

export interface TimelineItem {
  event: LifeEvent
  /** Set for events of one of the person's partner families. */
  family?: Family
}

/** Merges own, shared and partner-family events and sorts them by date. */
export function timelineItems(events: LifeEvent[], partnerFamilies: Family[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...events.map((event) => ({ event })),
    ...partnerFamilies.flatMap((family) => family.events.map((event) => ({ event, family }))),
  ]
  return items.sort((a, b) => {
    const ka = a.event.date.sortKey
    const kb = b.event.date.sortKey
    if (ka === null && kb === null) return a.event.id - b.event.id
    if (ka === null) return 1
    if (kb === null) return -1
    return ka - kb || a.event.sortOrder - b.event.sortOrder || a.event.id - b.event.id
  })
}
