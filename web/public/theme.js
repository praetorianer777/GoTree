// Runs before the app renders, so the first paint already has the chosen
// theme instead of flashing light first. Kept in sync with src/lib/theme.ts.
;(() => {
  let choice = 'system'
  try {
    choice = localStorage.getItem('gotree-theme') || 'system'
  } catch {
    // Storage can be blocked; the system theme is the fallback.
  }
  const dark = choice === 'dark' || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
})()
