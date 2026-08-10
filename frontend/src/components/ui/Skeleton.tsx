interface SkeletonProps {
  lines?: number
  className?: string
}

/** 骨架屏（DESIGN.md §6.1）：列表/卡片初始加载占位 */
export function Skeleton({ lines = 5, className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-busy="true" aria-label="加载中">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-panel-2" />
      ))}
    </div>
  )
}

interface SkeletonTextProps {
  className?: string
}

/** 文本行骨架 */
export function SkeletonText({ className = '' }: SkeletonTextProps) {
  return <div className={`h-4 animate-pulse rounded bg-panel-2 ${className}`} />
}

export type { SkeletonTextProps }
export default Skeleton
