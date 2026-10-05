import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeading } from '../components/PageHeading'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeading title={t('notFound.title')}>{t('notFound.title')}</PageHeading>
      <Link to="/" className="font-medium text-brand-700 underline underline-offset-4 dark:text-brand-100">
        {t('notFound.back')}
      </Link>
    </div>
  )
}
