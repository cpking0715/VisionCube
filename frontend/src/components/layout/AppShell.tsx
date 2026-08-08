import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { TopNav } from './TopNav'
import { SideNav } from './SideNav'
import { BottomNav } from './BottomNav'

/**
 * 应用外壳（DESIGN.md §4.1）三端布局：
 * - 桌面（lg+）：TopNav 64px + SideNav 240px（可折叠至 64px）+ Main ≤1280px
 * - 平板（md-lg）：TopNav 64px + SideNav 64px icon-only + Main 流式
 * - 手机（<md）：TopNav 56px + BottomNav 56px + Main 全屏宽
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidenav-collapsed') === '1',
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('sidenav-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  // 路由切换后自动关闭手机端 Drawer
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <TopNav onMenuClick={() => setMobileOpen(true)} />

      {/* 桌面/平板侧栏：平板恒为 64px，桌面随 collapsed 变化 */}
      <aside
        className={`fixed bottom-0 left-0 top-14 z-30 hidden flex-col border-r border-gray-200 bg-white
          transition-[width] duration-normal md:top-16 md:flex
          ${collapsed ? 'w-16' : 'w-16 lg:w-60'}`}
      >
        <div className="min-h-0 flex-1">
          <SideNav collapsed={collapsed} />
        </div>
        {/* 折叠按钮：仅桌面（lg+）显示 */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
          className="hidden h-12 w-full items-center justify-center border-t border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600 lg:flex"
        >
          <svg
            className={`h-5 w-5 transition-transform duration-normal ${collapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* 手机端 Drawer 菜单 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute bottom-0 left-0 top-0 flex w-64 flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="导航菜单"
          >
            <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
              </span>
              <span className="text-lg font-bold text-gray-800">VisionCube</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SideNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* 主内容区：平板 pl-16；桌面随 collapsed 变化；手机全宽 + 底部留白 */}
      <main
        className={`pb-16 pt-14 md:pb-0 md:pt-16
          ${collapsed ? 'md:pl-16' : 'md:pl-16 lg:pl-60'}`}
      >
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6 md:px-6">{children}</div>
      </main>

      <BottomNav />
    </div>
  )
}
