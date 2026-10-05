import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FormError } from '../auth/FormError'
import { Button } from './Button'

interface Props {
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  busy?: boolean
  error?: string | null
  children: ReactNode
  /** Extra actions on the left, e.g. Delete. */
  secondary?: ReactNode
}

/** A dialog form: Ctrl/Cmd+Enter submits from any field. */
export function Form({ onSubmit, onCancel, submitLabel, busy, error, children, secondary }: Props) {
  const { t } = useTranslation()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const form = ref.current
    if (!form) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        form.requestSubmit()
      }
    }
    form.addEventListener('keydown', onKeyDown)
    return () => form.removeEventListener('keydown', onKeyDown)
  }, [])
  return (
    <form ref={ref} onSubmit={submit} noValidate className="space-y-4">
      <FormError message={error ?? null} />
      {children}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div>{secondary}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" busy={busy}>
            {submitLabel}
            <span className="sr-only"> ({t('shortcuts.ctrlEnter')})</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
