import { type ReactNode } from 'react'
import { TopBar } from './TopBar'

/**
 * 应用外壳（以任务流程为中心）：
 * - TopBar（Logo + 任务切换器 + 设置齿轮 + 用户头像）
 * - 主内容区：全宽，各页面自行管理内部布局
 * - 无 SideNav / BottomNav
 */
export function AppShell({ children, activeTaskId }: { children: ReactNode; activeTaskId?: number }) {
  return (
    <div className="min-h-screen">
      <TopBar activeTaskId={activeTaskId} />
      <main className="pt-12 md:pt-11">
        {children}
      </main>
    </div>
  )
}
