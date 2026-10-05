import { useEffect, useRef } from 'react'

/**
 * Single-key shortcuts. They are ignored while typing in a field, while a
 * dialog is open and when a modifier is held, so they never steal input.
 */
export function useShortcuts(map: Record<string, () => void>, enabled = true) {
  const ref = useRef(map)
  useEffect(() => {
    ref.current = map
  })

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('dialog[open]')) return
      const action = ref.current[e.key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])
}
