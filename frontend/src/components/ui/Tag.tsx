import { type ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  onClose?: () => void
  className?: string
}

/** 可关闭标签（DESIGN.md §3.1.8）：筛选条件等 */
export function Tag({ children, onClose, className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-primary-100 px-2 py-1 text-sm font-medium text-primary-700 ${className}`}
    >
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="移除"
          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-primary-500 hover:bg-primary-200 hover:text-primary-700"
        >
          ×
        </button>
      )}
    </span>
  )
}
