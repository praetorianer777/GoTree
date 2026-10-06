import type { PersonRef } from '../api/types'
import { thumbUrl } from '../api/endpoints'

interface Props {
  person: Pick<PersonRef, 'givenNames' | 'surname' | 'portrait'> & Partial<Pick<PersonRef, 'sex'>>
  size: 32 | 40 | 64 | 96
}

const tint: Record<string, string> = {
  F: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
  M: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
}

/** The person's portrait, or their initials. Decorative: the name is always next to it. */
export function Avatar({ person, size }: Props) {
  const px = { 32: 'size-8', 40: 'size-10', 64: 'size-16', 96: 'size-24' }[size]
  if (person.portrait) {
    return (
      <img
        src={thumbUrl(person.portrait.mediaId, size > 64 ? 256 : 128, person.portrait.regionId)}
        alt=""
        loading="lazy"
        className={`${px} shrink-0 rounded-full object-cover`}
      />
    )
  }
  const initials = [person.givenNames, person.surname].map((n) => n.trim()[0] ?? '').join('')
  return (
    <span
      aria-hidden="true"
      className={`${px} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tint[person.sex ?? ''] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
    >
      {initials || '?'}
    </span>
  )
}
