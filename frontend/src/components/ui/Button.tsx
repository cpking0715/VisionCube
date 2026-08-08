import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
type Size = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-200',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-400 disabled:bg-gray-50',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:text-gray-300',
  danger:
    'bg-danger text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-200',
  icon: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:text-gray-300',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

/** 按钮（DESIGN.md §3.1.1）：5 变体 × 3 尺寸，loading 时禁止点击 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium
        transition-colors duration-fast disabled:cursor-not-allowed
        ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" color={variant === 'primary' || variant === 'danger' ? 'light' : 'primary'} />}
      {children}
    </button>
  )
}
