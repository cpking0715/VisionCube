import { useNavigate } from 'react-router-dom'

interface TopNavProps {
  onMenuClick?: () => void
}

/** 顶部导航（DESIGN.md §4.1）：桌面/平板 64px，手机 56px（Tailwind h-16 / h-14） */
export function TopNav({ onMenuClick }: TopNavProps) {
  const navigate = useNavigate()
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-panel/85 px-4 backdrop-blur-md md:h-16 md:px-6">
      <div className="flex items-center gap-3">
        {/* 手机端菜单按钮（平板 icon-only 侧栏不折叠，无需按钮） */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="打开菜单"
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-2 hover:bg-panel-2 lg:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
          aria-label="VisionCube 首页"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
            </svg>
          </span>
          <span className="text-lg font-bold text-ink-1">VisionCube</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        {/* 消息铃铛（阶段 2 预留） */}
        <button
          type="button"
          aria-label="消息"
          className="hidden h-10 w-10 items-center justify-center rounded-md text-ink-2 hover:bg-panel-2 sm:flex"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="用户菜单"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/15 text-sm font-semibold text-primary-300 hover:bg-primary-500/25"
        >
          {localStorage.getItem('username')?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  )
}
