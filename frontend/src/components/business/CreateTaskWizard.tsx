import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../../api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const INDUSTRIES = ['美妆', '数码', '食品', '服饰', '家居', '母婴', '汽车']

const STEPS = ['粘贴链接', '行业与卖点', '确认提交']

/**
 * 从抖音分享文本中提取视频链接。
 * 分享文本格式：「4.69 复制打开抖音，看看【作者的作品】标题 #话题 - 抖音 https://v.douyin.com/xxxx/ …」
 * 支持整段粘贴：提取首个 http(s) 链接，并截掉 URL 尾部粘连的中文标点/口令。
 */
function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s"'<>，。；：！？、（）【】《》]+/i)
  if (!m) return null
  return m[0].replace(/[，。；：！？、）】》"'`]+$/, '')
}

/** 创建任务向导卡片（工作台首页主卡片）：粘贴链接 → 行业卖点 → 确认提交 */
export function CreateTaskWizard() {
  const [step, setStep] = useState(0)
  const [sourceUrl, setSourceUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [extracted, setExtracted] = useState(false)
  const [industry, setIndustry] = useState('')
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const nav = useNavigate()

  function validateUrl(): boolean {
    const trimmed = sourceUrl.trim()
    // 已是纯链接直接通过；否则尝试从分享文本中提取
    if (/^https?:\/\//i.test(trimmed)) {
      setUrlError('')
      return true
    }
    const url = extractUrl(trimmed)
    if (url) {
      setSourceUrl(url)
      setExtracted(true)
      setUrlError('')
      return true
    }
    setUrlError('未检测到链接：请粘贴完整的抖音分享文本（需包含 https:// 链接）')
    return false
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
    <form onSubmit={submit} className="panel flex animate-fade-up flex-col p-5 md:p-6" style={{ animationDelay: '120ms' }}>
      {/* 标题 + 步骤指示 */}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink-1">创建新任务</h2>
          <p className="mt-0.5 text-xs text-ink-3">三步完成爆款视频复刻</p>
        </div>
        <div className="flex items-center gap-1.5 pt-1" aria-label={`第 ${step + 1} 步，共 ${STEPS.length} 步`}>
          {STEPS.map((label, i) => (
            <span
              key={label}
              title={label}
              className={`h-1.5 rounded-full transition-all duration-normal ${
                i < step
                  ? 'w-4 bg-success'
                  : i === step
                    ? 'w-6 bg-gradient-brand'
                    : 'w-4 bg-panel-2'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        {/* 步骤 0: 链接 */}
        {step === 0 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <Input
              label="源视频链接"
              required
              type="text"
              placeholder="粘贴抖音分享链接或分享文本"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value)
                setExtracted(false)
                if (urlError) validateUrl()
              }}
              onBlur={() => {
                if (!/^https?:\/\//i.test(sourceUrl.trim())) validateUrl()
              }}
              error={urlError}
              autoFocus
            />
            {extracted && <p className="text-xs text-success">已从分享文本中自动提取链接</p>}
            <div className="rounded-lg bg-panel-2/60 px-3 py-2.5 text-[11px] leading-relaxed text-ink-3">
              支持整段粘贴抖音分享口令，系统将自动提取其中的视频链接
            </div>
          </div>
        )}

        {/* 步骤 1: 行业与卖点 */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-1">目标行业</span>
              <div className="flex flex-wrap gap-1.5">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(industry === ind ? '' : ind)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-fast ${
                      industry === ind
                        ? 'border-primary-500 bg-primary-500/15 font-medium text-primary-300 shadow-sm'
                        : 'border-line text-ink-2 hover:border-primary-200 hover:bg-primary-500/10'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-1">产品卖点（可选）</span>
              <textarea
                className="input h-auto min-h-16 resize-y py-2 text-sm"
                rows={2}
                placeholder="例如：主打控油持妆，适合油皮…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </label>
          </div>
        )}

        {/* 步骤 2: 确认 */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-ink-1">确认任务信息</h3>
            <dl className="divide-y divide-line rounded-lg border border-line text-sm">
              <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
                <dt className="text-xs text-ink-3">源链接</dt>
                <dd className="break-all text-ink-1">{sourceUrl}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
                <dt className="text-xs text-ink-3">目标行业</dt>
                <dd className="text-ink-1">{industry || '未指定（通用）'}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
                <dt className="text-xs text-ink-3">产品卖点</dt>
                <dd className="whitespace-pre-wrap text-ink-1">{brief || '未填写'}</dd>
              </div>
            </dl>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* 底部操作栏 */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={back} disabled={pending}>上一步</Button>
        ) : <span />}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} className="min-w-28">下一步</Button>
        ) : (
          <Button type="submit" loading={pending} className="min-w-28">提交任务</Button>
        )}
      </div>
    </form>
  )
}
