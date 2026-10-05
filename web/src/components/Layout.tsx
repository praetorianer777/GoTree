import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { HomeIcon, PeopleIcon, TransferIcon, TreeIcon } from './icons'

const navItems = [
  { to: '/', key: 'nav.dashboard', Icon: HomeIcon, end: true },
  { to: '/people', key: 'nav.people', Icon: PeopleIcon, end: false },
  { to: '/tree', key: 'nav.tree', Icon: TreeIcon, end: false },
  { to: '/import-export', key: 'nav.importExport', Icon: TransferIcon, end: false },
] as const

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // Screen readers get no page-load event on client-side navigation, so focus
  // goes to the new page's heading; on the initial load it stays put.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const heading = mainRef.current?.querySelector<HTMLElement>('h1')
    ;(heading ?? mainRef.current)?.focus()
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-3 focus:text-white"
      >
        {t('app.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <img src="/icons/logo-64.png" alt="" width={32} height={32} className="size-8 rounded-md" />
        <span className="text-lg font-semibold text-brand-700 dark:text-brand-100">{t('app.name')}</span>
      </header>

      <div className="md:flex">
        <nav
          aria-label={t('app.mainNavigation')}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-60 md:shrink-0 md:border-t-0 md:border-r md:pb-0"
        >
          <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:p-3">
            {navItems.map(({ to, key, Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    [
                      'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm',
                      isActive
                        ? 'text-brand-700 md:bg-brand-50 dark:text-brand-100 md:dark:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 md:hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white md:dark:hover:bg-slate-900',
                    ].join(' ')
                  }
                >
                  <Icon />
                  <span className="text-center leading-tight">{t(key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 pt-6 pb-24 focus:outline-none md:px-8 md:pb-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
