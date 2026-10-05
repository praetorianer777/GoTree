import { useTranslation } from 'react-i18next'
import { PageHeading } from '../components/PageHeading'

export function Placeholder({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeading title={title}>{title}</PageHeading>
      <p className="text-slate-700 dark:text-slate-300">{t('placeholder.comingSoon')}</p>
    </div>
  )
}
