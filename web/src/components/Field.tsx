import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface Described {
  label: string
  error?: string
  hint?: ReactNode
}

function useDescribed(error?: string, hint?: ReactNode) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  return { id, hintId, errorId, describedBy }
}

function Label({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
      {label}
    </label>
  )
}

function Messages({ hintId, errorId, hint, error }: { hintId: string; errorId: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  )
}

const controlClass = (error?: string) =>
  [
    'mt-1 block w-full rounded-lg border bg-white px-3 text-base text-slate-900 dark:bg-slate-900 dark:text-slate-100',
    error ? 'border-red-700 dark:border-red-400' : 'border-slate-400 dark:border-slate-600',
  ].join(' ')

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...select
}: Described & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>) {
  const { id, hintId, errorId, describedBy } = useDescribed(error, hint)
  return (
    <div className={className}>
      <Label id={id} label={label} />
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${controlClass(error)} min-h-11`}
        {...select}
      >
        {children}
      </select>
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...area
}: Described & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
  const { id, hintId, errorId, describedBy } = useDescribed(error, hint)
  return (
    <div className={className}>
      <Label id={id} label={label} />
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${controlClass(error)} py-2`}
        {...area}
      />
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}
