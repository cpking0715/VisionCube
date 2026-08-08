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

export default function TaskDetail() {
  const { id } = useParams()
  const [task, setTask] = useState<T | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!id) return
    const load = () => getTask(Number(id)).then(setTask).catch(() => {})
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [id])

  if (!task) return <p className="p-6">加载中…</p>

  const rewriteScripts = task.scripts.filter((s) => s.kind === 'rewrite')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">任务 #{task.id} — {task.status}</h1>
      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
      {task.error_message && (
        <p className="text-red-600">{task.error_code}: {task.error_message}</p>
      )}

      <section>
        <h2 className="mb-1 font-bold">阶段日志</h2>
        <ul className="divide-y rounded border text-sm">
          {task.logs.map((l, i) => (
            <li key={i} className="flex justify-between p-2">
              <span>{l.stage}</span><span>{l.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {task.status === 'AWAITING_SCRIPT' && (
        <section>
          <h2 className="mb-1 font-bold">备选脚本（选一版确认）</h2>
          <div className="flex flex-col gap-2">
            {rewriteScripts.map((s) => (
              <label key={s.id} className="flex gap-2 rounded border p-2 text-sm">
                <input type="radio" checked={selected === s.id}
                  onChange={() => setSelected(s.id)} />
                <span>V{s.version}: {s.content.slice(0, 60)}…</span>
              </label>
            ))}
          </div>
          {rewriteScripts.length === 0 && (
            <p className="text-sm text-gray-500">暂无备选脚本</p>
          )}
          <button disabled={selected == null || pending}
            className="mt-2 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            onClick={async () => {
              if (selected == null) return
              setPending(true)
              setActionError('')
              try {
                await confirmScript(task.id, selected)
                setSelected(null)
              } catch {
                setActionError('操作失败，请重试')
              } finally {
                setPending(false)
              }
            }}>
            确认该版
          </button>
        </section>
      )}

      {task.status === 'REVIEW' && (
        <button disabled={pending}
          className="w-fit rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
          onClick={async () => {
            setPending(true)
            setActionError('')
            try {
              await completeTask(task.id)
            } catch {
              setActionError('操作失败，请重试')
            } finally {
              setPending(false)
            }
          }}>完成</button>
      )}
      {task.status === 'FAILED' && (
        <button disabled={pending}
          className="w-fit rounded bg-orange-600 px-3 py-1 text-white disabled:opacity-50"
          onClick={async () => {
            setPending(true)
            setActionError('')
            try {
              await retryTask(task.id)
            } catch {
              setActionError('操作失败，请重试')
            } finally {
              setPending(false)
            }
          }}>从失败阶段重试</button>
      )}
      {task.status === 'COMPLETED' && (
        <section>
          <h2 className="mb-1 font-bold">产物下载</h2>
          <ul className="flex gap-3 text-sm">
            {task.files.filter((f) => ['final', 'cover'].includes(f.kind)).map((f) => (
              <li key={f.id}>
                <button className="text-blue-600 underline"
                  onClick={() => downloadFile(f.id)
                    .catch(() => setActionError('下载失败，请重试'))}>
                  {f.kind === 'final' ? '成片 MP4' : `封面 ${f.id}`}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
