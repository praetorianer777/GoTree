import { forwardRef } from 'react'

/** A form-level error, announced when it appears and focusable for the user. */
export const FormError = forwardRef<HTMLDivElement, { message: string | null }>(function FormError({ message }, ref) {
  if (!message) return null
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-red-700 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </div>
  )
})
