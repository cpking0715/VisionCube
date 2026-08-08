import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTasks, type TaskOut } from '../api'

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskOut[]>([])

  useEffect(() => {
    const load = () => listTasks().then(setTasks).catch(() => {})
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">复刻任务</h1>
        <Link to="/new" className="rounded bg-blue-600 px-3 py-1 text-white">新建任务</Link>
      </div>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">ID</th><th>状态</th><th>源链接</th><th>行业</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">
                <Link className="text-blue-600" to={`/tasks/${t.id}`}>#{t.id}</Link>
              </td>
              <td>{t.status}</td>
              <td className="max-w-40 truncate">{t.source_url}</td>
              <td>{t.target_industry ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
