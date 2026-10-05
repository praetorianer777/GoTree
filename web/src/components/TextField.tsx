import { useId, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, className, ...input }: Props) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 dark:bg-slate-900 dark:text-slate-100',
          error ? 'border-red-700 dark:border-red-400' : 'border-slate-400 dark:border-slate-600',
        ].join(' ')}
        {...input}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
