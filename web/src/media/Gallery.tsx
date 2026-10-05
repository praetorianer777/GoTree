import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { listMedia, thumbUrl, type MediaOwner } from '../api/endpoints'
import type { MediaRef } from '../api/types'

const kindIcon: Record<string, string> = { document: '📄', audio: '🎙', video: '🎞' }

export function Gallery({ owner }: { owner: MediaOwner | null }) {
  const { t } = useTranslation()
  const media = useQuery({
    queryKey: ['media', owner?.entityType ?? 'all', owner?.entityId ?? 0],
    queryFn: ({ signal }) => listMedia(owner, signal),
  })
  if (media.isPending) return <p role="status">{t('app.loading')}</p>
  if (media.isError) return <p role="alert">{t('common.loadFailed')}</p>
  if (media.data.length === 0) return <p className="text-slate-600 dark:text-slate-400">{t('media.none')}</p>
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {media.data.map((m) => (
        <li key={m.id}>
          <MediaTile media={m} />
        </li>
      ))}
    </ul>
  )
}

export function MediaTile({ media }: { media: MediaRef }) {
  const { t } = useTranslation()
  const label = media.title || t(`media.kinds.${media.kind}`)
  return (
    <Link
      to={`/media/${media.id}`}
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
    >
      <span className="block aspect-square">
        {media.kind === 'image' ? (
          <img src={thumbUrl(media.id, 256)} alt="" loading="lazy" className="size-full object-cover group-hover:opacity-90" />
        ) : (
          <span aria-hidden="true" className="flex size-full items-center justify-center text-4xl">
            {kindIcon[media.kind]}
          </span>
        )}
      </span>
      <span className="block truncate px-2 py-1 text-xs">
        {label}
        {media.kind !== 'image' && <span className="sr-only"> ({t(`media.kinds.${media.kind}`)})</span>}
      </span>
    </Link>
  )
}
