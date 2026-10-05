import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The page's single h1. It also sets the document title, and is the element
 * the layout moves focus to after client-side navigation.
 */
export function PageHeading({ children, title }: { children: ReactNode; title: string }) {
  const { t } = useTranslation()
  const appName = t('app.name')
  useEffect(() => {
    document.title = title === appName ? appName : `${title} · ${appName}`
  }, [title, appName])

  return (
    <h1 tabIndex={-1} className="text-2xl font-semibold tracking-tight focus:outline-none md:text-3xl">
      {children}
    </h1>
  )
}
