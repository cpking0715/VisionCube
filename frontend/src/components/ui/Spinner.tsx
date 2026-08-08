interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'light'
  className?: string
}

const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
const colorClass = { primary: 'text-primary-500', light: 'text-white' }

/** 环形加载图标（DESIGN.md §3.2.6） */
export function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`inline-block animate-spin ${sizeClass[size]} ${colorClass[color]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="加载中"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
