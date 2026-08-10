import { useNavigate } from 'react-router-dom'
import { type TaskOut } from '../../api'
import { StatusBadge } from './StatusBadge'

interface TaskListCardProps {
  tasks: TaskOut[]
  /** 最多展示条数 */
  limit?: number
}

/** 最近任务卡片（工作台首页）：任务行点击进入详情 */
export function TaskListCard({ tasks, limit = 6 }: TaskListCardProps) {
  const nav = useNavigate()
  const items = tasks.slice(0, limit)

  return (
    <div className="panel flex flex-col p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-1">最近任务</h2>
        <span className="text-xs text-ink-3">共 {tasks.length} 个</span>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/15 text-primary-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5h6M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5V3h6v2m-8 0h10a1 1 0 011 1v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6a1 1 0 011-1z" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </span>
          <p className="text-sm font-medium text-ink-2">还没有任务</p>
          <p className="text-xs text-ink-3">粘贴一条抖音链接，开始第一次复刻</p>
        </div>
      ) : (
        <>
          <ul className="mt-2 flex flex-col gap-0.5">
            {items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => nav(`/tasks/${t.id}`)}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-fast hover:bg-primary-500/10"
                >
                  <span className="w-9 shrink-0 text-xs font-semibold text-ink-3 group-hover:text-primary-500">
                    #{t.id}
                  </span>
                  <StatusBadge status={t.status} />
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-2">{t.source_url}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
