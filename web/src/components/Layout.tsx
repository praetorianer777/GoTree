import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { getAuthState, logout } from '../api/client'
import { useShortcuts } from '../hooks/useShortcuts'
import { Button } from './Button'
import { ShortcutsHelp } from './ShortcutsHelp'
import { ThemeSwitch } from './ThemeSwitch'
import { UpdateNotice } from './UpdateNotice'
import { CheckIcon, HeirloomIcon, HomeIcon, LinkIcon, PeopleIcon, PhotoIcon, ResearchIcon, ShareIcon, TranscribeIcon, SourceIcon, TransferIcon, TreeIcon } from './icons'

// The phone bar has room for five; the rest appear from md up and are
// reachable on phones through the pages that use them.
const navItems = [
  { to: '/', key: 'nav.dashboard', Icon: HomeIcon, end: true, phone: true },
  { to: '/people', key: 'nav.people', Icon: PeopleIcon, end: false, phone: true },
  { to: '/tree', key: 'nav.tree', Icon: TreeIcon, end: false, phone: true },
  { to: '/sources', key: 'nav.sources', Icon: SourceIcon, end: false, phone: true },
  { to: '/media', key: 'nav.media', Icon: PhotoIcon, end: false, phone: false },
  { to: '/heirlooms', key: 'nav.heirlooms', Icon: HeirloomIcon, end: false, phone: false },
  { to: '/transcribe', key: 'nav.transcribe', Icon: TranscribeIcon, end: false, phone: false },
  { to: '/research', key: 'nav.research', Icon: ResearchIcon, end: false, phone: false },
  { to: '/relationship', key: 'nav.relationship', Icon: LinkIcon, end: false, phone: false },
  { to: '/quality', key: 'nav.quality', Icon: CheckIcon, end: false, phone: false },
  { to: '/sharing', key: 'nav.sharing', Icon: ShareIcon, end: false, phone: false },
  { to: '/import-export', key: 'nav.importExport', Icon: TransferIcon, end: false, phone: true },
] as const

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const queryClient = useQueryClient()
  const auth = useQuery({ queryKey: ['auth'], queryFn: ({ signal }) => getAuthState(signal), staleTime: Infinity })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop everything the previous user loaded, but keep the auth query
      // mounted so its refetch switches to the login screen.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      void queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
  const user = auth.data?.user
  const navigate = useNavigate()
  const [help, setHelp] = useState(false)
  const onPeople = location.pathname === '/people'

  // The people page handles "/" and "n" itself; elsewhere they go there.
  useShortcuts({
    '?': () => setHelp(true),
    ...(onPeople
      ? {}
      : {
          '/': () => {
            navigate('/people')
            setTimeout(() => document.getElementById('people-search')?.focus(), 50)
          },
          n: () => navigate('/people?new=1'),
        }),
  })

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
    <div className="min-h-dvh bg-white text-slate-900 print:min-h-0 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only print:hidden focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-3 focus:text-white"
      >
        {t('app.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 flex print:hidden h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <img src="/icons/logo-64.png" alt="" width={32} height={32} className="size-8 rounded-md" />
        <span className="text-lg font-semibold text-brand-700 dark:text-brand-100">{t('app.name')}</span>
        {auth.data?.tree && (
          <span className="hidden truncate text-slate-600 sm:inline dark:text-slate-400">· {auth.data.tree.name}</span>
        )}
        {user && (
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeSwitch />
            <span className="sr-only">{t('app.signedInAs', { name: user.displayName || user.username })}</span>
            <span aria-hidden="true" className="hidden text-sm text-slate-600 sm:inline dark:text-slate-400">
              {user.displayName || user.username}
            </span>
            <Button variant="secondary" onClick={() => logoutMutation.mutate()} busy={logoutMutation.isPending}>
              {t('app.logOut')}
            </Button>
          </div>
        )}
      </header>

      <div className="md:flex">
        <nav
          aria-label={t('app.mainNavigation')}
          className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-60 md:shrink-0 md:border-t-0 md:border-r md:pb-0"
        >
          <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1 md:p-3">
            {navItems.map(({ to, key, Icon, end, phone }) => (
              <li key={to} className={phone ? undefined : 'hidden md:block'}>
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
          className="min-w-0 flex-1 px-4 pt-6 pb-24 focus:outline-none md:px-8 md:pb-8 print:p-0"
        >
          <Outlet />
        </main>
      </div>
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
      <UpdateNotice />
    </div>
  )
}
