import { type ReactNode } from 'react'

export type StatTone = 'primary' | 'info' | 'warning' | 'success' | 'danger' | 'gray'

const toneClass: Record<StatTone, string> = {
  primary: 'bg-primary-500/15 text-primary-300',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  gray: 'bg-panel-2 text-ink-2',
}

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  tone: StatTone
  /** 入场动画延迟（ms），用于卡片依次浮现 */
  delay?: number
}

/** 工作台统计卡片：图标 + 数字 + 标签，hover 悬浮提升 */
export function StatCard({ label, value, icon, tone, delay = 0 }: StatCardProps) {
  return (
    <div
      className="panel panel-hover animate-fade-up p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass[tone]}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold leading-none text-ink-1">{value}</p>
      <p className="mt-1.5 text-xs text-ink-2">{label}</p>
    </div>
  )
}
