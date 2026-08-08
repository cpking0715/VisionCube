import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

/** 卡片容器（DESIGN.md §3.3.2）：hover 时阴影加深 */
export function Card({ hover = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`card transition-shadow duration-normal ${hover ? 'hover:shadow-md' : ''} ${className}`}
      {...rest}
    />
  )
}
