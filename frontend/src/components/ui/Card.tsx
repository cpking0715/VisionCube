import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片变体：panel = 工作台圆角卡片（默认），card = 传统紧凑卡片 */
  variant?: 'panel' | 'card'
  /** hover 时悬浮提升（阴影加深 + 轻微上移） */
  hover?: boolean
  /** 内边距：none / sm(12) / md(16) / lg(24)，默认 md */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 md:p-6',
} as const

/** 卡片容器（DESIGN.md §3.3.2）：panel 变体用于卡片工作台风格布局 */
export function Card({
  variant = 'panel',
  hover = false,
  padding = 'md',
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={`${variant === 'panel' ? 'panel' : 'card'} ${paddingClass[padding]} ${
        hover ? 'panel-hover' : ''
      } ${className}`}
      {...rest}
    />
  )
}
