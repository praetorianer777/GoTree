import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveTheme, storedTheme, watchSystemTheme, type Theme } from '../lib/theme'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(storedTheme)
  const current = useRef(theme)
  useEffect(() => {
    current.current = theme
  }, [theme])
  useEffect(() => watchSystemTheme(() => current.current), [])

  return (
    <>
      <label htmlFor="theme-switch" className="sr-only">
        {t('theme.label')}
      </label>
      <select
        id="theme-switch"
        value={theme}
        onChange={(e) => {
          const next = e.target.value as Theme
          setTheme(next)
          saveTheme(next)
        }}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="system">{t('theme.system')}</option>
        <option value="light">{t('theme.light')}</option>
        <option value="dark">{t('theme.dark')}</option>
      </select>
    </>
  )
}
