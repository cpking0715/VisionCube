import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../api'

export default function NewTask() {
  const [sourceUrl, setSourceUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const task = await createTask({
        source_url: sourceUrl,
        target_industry: industry || null,
        product_brief: brief || null,
      })
      nav(`/tasks/${task.id}`)
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 flex w-96 flex-col gap-3">
      <h1 className="text-xl font-bold">新建复刻任务</h1>
      <input className="rounded border p-2" placeholder="抖音爆款视频链接" required
        value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      <input className="rounded border p-2" placeholder="目标行业（可选，如：美妆）"
        value={industry} onChange={(e) => setIndustry(e.target.value)} />
      <textarea className="rounded border p-2" rows={3} placeholder="产品卖点描述（可选）"
        value={brief} onChange={(e) => setBrief(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 p-2 text-white">提交</button>
    </form>
  )
}
