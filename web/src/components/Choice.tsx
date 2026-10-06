import { useId } from 'react'

/** A radio group whose options each have a label and a hint. */
export function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: T
  options: { value: T; label: string; hint: string }[]
  onChange: (v: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{legend}</legend>
      {options.map((o) => (
        <div key={o.value} className="flex items-start gap-3">
          <input
            id={`${name}-${o.value}`}
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            aria-describedby={`${name}-${o.value}-hint`}
            className="mt-1 size-5"
          />
          <div>
            <label htmlFor={`${name}-${o.value}`} className="block">
              {o.label}
            </label>
            <p id={`${name}-${o.value}-hint`} className="text-sm text-slate-600 dark:text-slate-400">
              {o.hint}
            </p>
          </div>
        </div>
      ))}
    </fieldset>
  )
}
