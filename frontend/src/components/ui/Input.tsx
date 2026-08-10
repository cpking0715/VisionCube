import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

/** 输入框（DESIGN.md §3.1.2）：label 在上方，error 态下方红色提示 */
export function Input({ label, error, required, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? (label ? `input-${label}` : undefined)
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-1">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
