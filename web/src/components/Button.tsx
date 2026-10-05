import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  busy?: boolean
}

export function Button({ variant = 'primary', busy, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-medium disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary'
          ? 'bg-brand-700 text-white hover:bg-brand-800'
          : 'border border-slate-400 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
