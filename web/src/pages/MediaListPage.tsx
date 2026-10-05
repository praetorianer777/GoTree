import { useTranslation } from 'react-i18next'
import { PageHeading } from '../components/PageHeading'
import { Gallery } from '../media/Gallery'
import { UploadButton } from '../media/UploadButton'

export function MediaListPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title={t('nav.media')}>{t('nav.media')}</PageHeading>
        <UploadButton owner={null} />
      </div>
      <p className="text-slate-700 dark:text-slate-300">{t('media.intro')}</p>
      <Gallery owner={null} />
    </div>
  )
}
