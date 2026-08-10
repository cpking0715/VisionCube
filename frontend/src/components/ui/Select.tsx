import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  error?: string
  required?: boolean
}

/** 下拉选择（DESIGN.md §3.1.3）：与 Input 同尺寸/状态；手机端原生 select 即可获得全屏选择器 */
export function Select({
  label,
  options,
  error,
  required,
  className = '',
  id,
  ...rest
}: SelectProps) {
  const selectId = id ?? (label ? `select-${label}` : undefined)
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-1">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%239aa3b5%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22M8%2011%204%207h8l-4%204z%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-9 ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
