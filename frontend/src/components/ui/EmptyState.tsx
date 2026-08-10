import { type ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

/** 空态（DESIGN.md §3.2.7 + §6.3）：插图 + 标题 + 描述 + 行动按钮 */
export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div
        className={`flex items-center justify-center rounded-full bg-panel-2 text-ink-3 ${compact ? 'h-20 w-20' : 'h-28 w-28'}`}
        aria-hidden
      >
        <svg
          className={compact ? 'h-8 w-8' : 'h-12 w-12'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
          />
        </svg>
      </div>
      <p className={`font-semibold text-ink-1 ${compact ? 'text-base' : 'text-lg'}`}>{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
