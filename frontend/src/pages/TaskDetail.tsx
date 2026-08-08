import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  completeTask,
  confirmScript,
  downloadFile,
  getTask,
  retryTask,
  type TaskDetail as T,
} from '../api'
import { Button, Card, Skeleton, Spinner, useToast } from '../components/ui'
import { StageTimeline, StatusBadge } from '../components/business'

/**
 * 任务详情页（DESIGN.md §5.4）：
 * 桌面：左 60% 阶段时间线 + 右 40% 操作面板；平板/手机：纵向堆叠 + 手机底部固定操作栏
 */
export default function TaskDetail() {
  const { id } = useParams()
  const [task, setTask] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (!id) return
    const load = () =>
      getTask(Number(id))
        .then((data) => {
          setTask(data)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [id])

  async function runAction(fn: () => Promise<unknown>, okMsg: string) {
    setPending(true)
    setActionError('')
    try {
      await fn()
      toast('success', okMsg)
    } catch {
      setActionError('操作失败，请重试')
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton lines={2} className="max-w-2xl" />
        <Skeleton lines={6} />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">任务不存在或已被删除</p>
      </div>
    )
  }

  const rewriteScripts = task.scripts.filter((s) => s.kind === 'rewrite')

  // 各状态的主操作（手机端固定底部栏 + 桌面端面板共用）
  const renderAction = () => {
    if (task.status === 'AWAITING_SCRIPT') {
      return (
        <Button
          disabled={selected == null || pending}
          loading={pending}
          onClick={() =>
            selected != null && runAction(() => confirmScript(task.id, selected), '脚本已确认，继续生成')
          }
        >
          确认该版脚本
        </Button>
      )
    }
    if (task.status === 'REVIEW') {
      return (
        <Button loading={pending} onClick={() => runAction(() => completeTask(task.id), '任务已完成')}>
          完成审核
        </Button>
      )
    }
    if (task.status === 'FAILED') {
      return (
        <Button variant="danger" loading={pending} onClick={() => runAction(() => retryTask(task.id), '已从失败阶段重试')}>
          从失败阶段重试
        </Button>
      )
    }
    return null
  }

  const action = renderAction()

  return (
    <div>
      {/* 顶部状态横幅 */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800 md:text-xl">任务 #{task.id}</h1>
          <StatusBadge status={task.status} />
        </div>
        <p className="truncate text-sm text-gray-400" title={task.source_url}>
          {task.source_url}
        </p>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md border border-danger bg-danger-bg px-4 py-2.5 text-sm text-danger">
          {actionError}
        </div>
      )}

      {/* 失败态错误卡片 */}
      {task.status === 'FAILED' && task.error_message && (
        <div className="mb-4 rounded-md border border-danger bg-danger-bg p-4">
          <p className="text-sm font-semibold text-danger">
            失败阶段：{task.failed_stage ?? '未知'}（{task.error_code ?? 'UNKNOWN'}）
          </p>
          <p className="mt-1 break-all text-sm text-gray-600">{task.error_message}</p>
        </div>
      )}

      {/* 桌面双栏 / 平板手机纵向 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">阶段时间线</h2>
            <StageTimeline logs={task.logs} />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-semibold text-gray-700">操作面板</h2>

            {task.status === 'AWAITING_SCRIPT' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-500">备选脚本（选一版确认）</p>
                {rewriteScripts.length === 0 && (
                  <p className="text-sm text-gray-400">暂无备选脚本</p>
                )}
                {rewriteScripts.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors ${
                      selected === s.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 accent-primary-500"
                      checked={selected === s.id}
                      onChange={() => setSelected(s.id)}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700">V{s.version}</p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-gray-500">
                        {s.content}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {task.status === 'REVIEW' && (
              <p className="text-sm text-gray-500">
                视频与封面已生成完毕，确认后标记为完成。（封面与字幕样式编辑属阶段 2）
              </p>
            )}

            {task.status === 'COMPLETED' && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-500">产物下载</p>
                {task.files.filter((f) => ['final', 'cover'].includes(f.kind)).length === 0 && (
                  <p className="text-sm text-gray-400">暂无产物文件</p>
                )}
                {task.files
                  .filter((f) => ['final', 'cover'].includes(f.kind))
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => downloadFile(f.id).catch(() => setActionError('下载失败，请重试'))}
                      className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:border-primary-300 hover:bg-primary-50"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                        </svg>
                        {f.kind === 'final' ? '成片 MP4' : '封面图片'}
                      </span>
                      <span className="text-xs text-gray-400">下载</span>
                    </button>
                  ))}
              </div>
            )}

            {!['AWAITING_SCRIPT', 'REVIEW', 'FAILED', 'COMPLETED'].includes(task.status) && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Spinner size="sm" />
                流水线执行中，页面每 2 秒自动刷新…
              </div>
            )}

            {/* 桌面端操作按钮（手机端移到底部固定栏） */}
            {action && <div className="hidden md:block">{action}</div>}
          </Card>
        </div>
      </div>

      {/* 手机端底部固定操作栏 */}
      {action && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-gray-200 bg-white p-4 shadow-md md:hidden [&>button]:w-full">
          {action}
        </div>
      )}
    </div>
  )
}
