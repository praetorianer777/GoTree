import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
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
        {
          primary: 'bg-brand-700 text-white hover:bg-brand-800',
          secondary:
            'border border-slate-400 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
          danger: 'bg-red-700 text-white hover:bg-red-800',
          ghost: 'text-brand-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-slate-800',
        }[variant],
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
