import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getHealth } from '../api/client'
import { PageHeading } from '../components/PageHeading'

export function Dashboard() {
  const { t } = useTranslation()
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => getHealth(signal) })

  let status: string
  if (health.isPending) status = t('dashboard.checking')
  else if (health.isError) status = t('dashboard.offline')
  else status = t('dashboard.online', { version: health.data.version })

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeading title={t('app.name')}>{t('dashboard.title')}</PageHeading>
      <p className="text-slate-700 dark:text-slate-300">{t('dashboard.intro')}</p>
      <section aria-labelledby="server-status" className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 id="server-status" className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          {t('dashboard.serverStatus')}
        </h2>
        <p role="status" className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className={[
              'inline-block size-2.5 rounded-full',
              health.isPending ? 'bg-slate-400' : health.isError ? 'bg-red-600' : 'bg-leaf-500',
            ].join(' ')}
          />
          {status}
        </p>
      </section>
    </div>
  )
}
