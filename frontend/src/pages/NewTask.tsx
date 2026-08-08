import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const INDUSTRIES = ['美妆', '数码', '食品', '服饰', '家居', '母婴', '汽车']

const STEPS = ['粘贴链接', '行业与卖点', '确认提交']

/** 新建任务向导（DESIGN.md §5.3）：链接 → 行业/卖点 → 确认（音色/形象/字幕配置属阶段 2） */
export default function NewTask() {
  const [step, setStep] = useState(0)
  const [sourceUrl, setSourceUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [industry, setIndustry] = useState('')
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const nav = useNavigate()

  function validateUrl(): boolean {
    const ok = /^https?:\/\/.+/i.test(sourceUrl)
    setUrlError(ok ? '' : '请输入以 http:// 或 https:// 开头的有效链接')
    return ok
  }

  function next() {
    if (step === 0 && !validateUrl()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!validateUrl()) return
    setPending(true)
    setError('')
    try {
      const task = await createTask({
        source_url: sourceUrl,
        target_industry: industry || null,
        product_brief: brief || null,
      })
      nav(`/tasks/${task.id}`)
    } catch (err) {
      setError(`创建失败：${String(err).replace(/^Error: /, '')}`)
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* 进度指示器：手机圆点，桌面带标签 */}
      <div className="mb-8">
        <ol className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-1">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  i < step
                    ? 'bg-primary-500 text-white'
                    : i === step
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`h-0.5 flex-1 rounded ${i < step ? 'bg-primary-500' : 'bg-gray-200'}`} />
              )}
            </li>
          ))}
        </ol>
        <div className="mt-2 hidden justify-between text-sm text-gray-500 md:flex">
          {STEPS.map((label, i) => (
            <span key={label} className={i === step ? 'font-medium text-primary-600' : ''}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Input
              label="源视频链接"
              required
              type="url"
              placeholder="粘贴抖音分享链接"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value)
                if (urlError) validateUrl()
              }}
              error={urlError}
              autoFocus
            />
            <p className="text-xs text-gray-400">
              支持 http(s) 直链；稍后阶段将支持抖音分享口令解析
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">目标行业</span>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(industry === ind ? '' : ind)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      industry === ind
                        ? 'border-primary-500 bg-primary-100 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-primary-200'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="行业（自定义）"
              placeholder="未命中预设时手动输入"
              value={INDUSTRIES.includes(industry) ? '' : industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">产品卖点描述（可选）</span>
              <textarea
                className="input h-auto min-h-24 resize-y py-2"
                rows={3}
                placeholder="例如：主打控油持妆，适合油皮，性价比高…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-800">确认任务信息</h2>
            <dl className="divide-y divide-gray-50 rounded-md border border-gray-100 text-sm">
              <div className="flex flex-col gap-1 px-4 py-3">
                <dt className="text-gray-400">源链接</dt>
                <dd className="break-all text-gray-700">{sourceUrl}</dd>
              </div>
              <div className="flex flex-col gap-1 px-4 py-3">
                <dt className="text-gray-400">目标行业</dt>
                <dd className="text-gray-700">{industry || '未指定（通用）'}</dd>
              </div>
              <div className="flex flex-col gap-1 px-4 py-3">
                <dt className="text-gray-400">产品卖点</dt>
                <dd className="whitespace-pre-wrap text-gray-700">{brief || '未填写'}</dd>
              </div>
            </dl>
            <p className="text-xs text-gray-400">
              提交后任务将自动进入解析流水线，可在任务列表实时查看进度
            </p>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* 底部操作栏：桌面/平板页内，手机固定底部 */}
        <div className="flex justify-between gap-3 md:justify-end">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={back} disabled={pending}>
              上一步
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              下一步
            </Button>
          ) : (
            <Button type="submit" loading={pending}>
              提交任务
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
