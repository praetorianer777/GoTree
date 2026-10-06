import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getHealth } from '../api/client'
import { getOnThisDay, listTasks } from '../api/endpoints'
import { PageHeading } from '../components/PageHeading'
import { TaskList } from '../research/ResearchPanel'
import { OnThisDay } from '../share/OnThisDay'

export function Dashboard() {
  const { t } = useTranslation()
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => getHealth(signal) })
  const tasks = useQuery({
    queryKey: ['research', 'tasks', 'dashboard'],
    queryFn: ({ signal }) => listTasks({ status: 'active', limit: 5 }, signal),
  })

  let status: string
  if (health.isPending) status = t('dashboard.checking')
  else if (health.isError) status = t('dashboard.offline')
  else status = t('dashboard.online', { version: health.data.version })

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeading title={t('app.name')}>{t('dashboard.title')}</PageHeading>
      <p className="text-slate-700 dark:text-slate-300">{t('dashboard.intro')}</p>
      <OnThisDay queryKey={['dashboard']} load={getOnThisDay} />
      {tasks.data && tasks.data.length > 0 && (
        <section aria-labelledby="open-tasks" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="open-tasks" className="text-xl font-semibold">
              {t('research.openTasks')}
            </h2>
            <Link to="/research" className="inline-flex min-h-11 items-center font-medium text-brand-700 underline dark:text-brand-100">
              {t('research.allTasks')}
            </Link>
          </div>
          <TaskList tasks={tasks.data} pending={false} />
        </section>
      )}
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
      {/* The phone bar has no room for these; this is their way in there. */}
      <nav aria-labelledby="more-tools">
        <h2 id="more-tools" className="text-xl font-semibold">
          {t('dashboard.more')}
        </h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              ['/media', 'nav.media'],
              ['/transcribe', 'nav.transcribe'],
              ['/research', 'nav.research'],
              ['/relationship', 'nav.relationship'],
              ['/quality', 'nav.quality'],
              ['/sharing', 'nav.sharing'],
            ] as const
          ).map(([to, key]) => (
            <li key={to}>
              <Link
                to={to}
                className="flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
