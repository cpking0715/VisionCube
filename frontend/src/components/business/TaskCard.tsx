import { Link } from 'react-router-dom'
import { type TaskOut } from '../../api'
import { Card } from '../ui/Card'
import { StatusBadge } from './StatusBadge'

/** 任务卡片（DESIGN.md §3.5.1）：手机端列表项，替代表格行 */
export function TaskCard({ task }: { task: TaskOut }) {
  return (
    <Link to={`/tasks/${task.id}`} className="block">
      <Card hover className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-800">
            #{task.id} {task.target_industry ?? '通用行业'}
          </p>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-2 truncate text-sm text-gray-500">{task.source_url}</p>
        <div className="mt-3 flex items-center justify-between">
          {task.error_message ? (
            <p className="truncate text-xs text-danger">{task.error_message}</p>
          ) : (
            <span className="text-xs text-gray-400">点击查看详情</span>
          )}
          <svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Card>
    </Link>
  )
}
