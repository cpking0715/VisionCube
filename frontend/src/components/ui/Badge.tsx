import { type ReactNode } from 'react'

export type BadgeTone = 'primary' | 'gray' | 'success' | 'warning' | 'danger' | 'info'

type Tone = BadgeTone

const toneClass: Record<Tone, string> = {
  primary: 'bg-primary-500/15 text-primary-300',
  gray: 'bg-panel-2 text-ink-2',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
}

const dotClass: Record<Tone, string> = {
  primary: 'bg-primary-400',
  gray: 'bg-ink-3',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}

/** 状态徽章（DESIGN.md §3.1.7 + §3.5.2）：圆点 + 文字，颜色语义映射见 DESIGN.md §2.1.5 */
export function Badge({ tone = 'gray', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[tone]} ${className}`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dotClass[tone]}`} />}
      {children}
    </span>
  )
}
