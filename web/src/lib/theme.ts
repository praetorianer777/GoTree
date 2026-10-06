export type Theme = 'system' | 'light' | 'dark'

const key = 'gotree-theme'
const darkQuery = '(prefers-color-scheme: dark)'

export function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(key)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Applies the theme to <html>, the same way public/theme.js does at load. */
export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.(darkQuery).matches)
  document.documentElement.classList.toggle('dark', !!dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#0f5c7a')
}

export function saveTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(key)
    else localStorage.setItem(key, theme)
  } catch {
    // Without storage the choice lasts until the page is reloaded.
  }
  applyTheme(theme)
}

/** Follows system changes while the theme is "system"; returns the unsubscribe. */
export function watchSystemTheme(getTheme: () => Theme): () => void {
  const mq = window.matchMedia?.(darkQuery)
  if (!mq) return () => {}
  const onChange = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
