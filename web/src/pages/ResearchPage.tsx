import { useTranslation } from 'react-i18next'
import { PageHeading } from '../components/PageHeading'
import { ResearchPanel } from '../research/ResearchPanel'

export function ResearchPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <PageHeading title={t('nav.research')}>{t('nav.research')}</PageHeading>
        <p className="text-slate-700 dark:text-slate-300">{t('research.intro')}</p>
      </div>
      <ResearchPanel headingLevel={2} />
    </div>
  )
}
