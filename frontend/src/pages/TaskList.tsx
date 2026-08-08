import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTasks, type TaskOut } from '../api'
import { EmptyState, Skeleton } from '../components/ui'
import { Button } from '../components/ui/Button'
import { StatusBadge, TaskCard } from '../components/business'

/** 任务列表页（DESIGN.md §5.2）：桌面表格 / 平板紧凑表格 / 手机卡片列表 + FAB */
export default function TaskList() {
  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      listTasks()
        .then((data) => {
          setTasks(data)
          setError('')
          setLoading(false)
        })
        .catch(() => {
          setError('加载失败，请检查网络')
          setLoading(false)
        })
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">复刻任务</h1>
          <p className="mt-1 text-sm text-gray-400">追踪视频复刻流水线的完整进度</p>
        </div>
        <Link to="/new" className="hidden md:block">
          <Button>新建任务</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-danger bg-danger-bg px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            重试
          </Button>
        </div>
      )}

      {loading && <Skeleton lines={5} />}

      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          title="还没有任务"
          description="粘贴一个抖音爆款视频链接，开始你的第一条复刻流水线"
          action={
            <Link to="/new">
              <Button>创建第一个任务</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && tasks.length > 0 && (
        <>
          {/* 桌面/平板：表格（平板隐藏行业列） */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">源链接</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">行业</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-primary-600 hover:underline" to={`/tasks/${t.id}`}>
                        #{t.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="max-w-64 truncate px-4 py-3 text-gray-600" title={t.source_url}>
                      {t.source_url}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                      {t.target_industry ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 手机：卡片列表 */}
          <div className="flex flex-col gap-3 md:hidden">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </>
      )}

      {/* 手机端 FAB：悬浮新建按钮（≥44px 触控目标） */}
      <Link
        to="/new"
        aria-label="新建任务"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  )
}
