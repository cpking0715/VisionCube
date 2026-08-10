import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  completeTask,
  confirmScript,
  downloadFile,
  fetchFileUrl,
  getTask,
  retryTask,
  type TaskDetail as T,
} from '../api'
import { Badge, Button, Skeleton, Spinner, useToast, type BadgeTone } from '../components/ui'
import {
  CoverPicker,
  PipelineSteps,
  ScriptEditor,
  StatusBadge,
  SubtitleStylePanel,
  type CoverItem,
  type PipelinePhase,
  type PhaseSubStep,
  type StepStatus,
} from '../components/business'
import { AppShell } from '../components/layout'

/* ── 阶段模型：14 个流水线步骤合并为 5 个阶段 ───────────── */

const PHASES: { id: string; label: string; desc: string; manual: boolean; steps: { id: string; label: string }[] }[] = [
  {
    id: 'UNDERSTAND', label: '内容理解', desc: '解析视频、转写文本、分析结构、改写脚本', manual: false,
    steps: [
      { id: 'PARSING', label: '解析视频' },
      { id: 'TRANSCRIBING', label: '语音转写' },
      { id: 'ANALYZING', label: '内容分析' },
      { id: 'REWRITING', label: '脚本改写' },
    ],
  },
  {
    id: 'AWAITING_SCRIPT', label: '脚本确认', desc: '选择一版脚本继续生成', manual: true,
    steps: [{ id: 'AWAITING_SCRIPT', label: '脚本确认' }],
  },
  {
    id: 'GENERATE', label: '内容生成', desc: '标题话题、审核、配音、数字人、合成、封面', manual: false,
    steps: [
      { id: 'META_GENERATING', label: '元信息生成' },
      { id: 'MODERATING_TEXT', label: '文本审核' },
      { id: 'SYNTHESIZING', label: '语音合成' },
      { id: 'GENERATING_AVATAR', label: '数字人生成' },
      { id: 'COMPOSING', label: '视频合成' },
      { id: 'GENERATING_COVER', label: '封面生成' },
      { id: 'MODERATING_VIDEO', label: '视频审核' },
    ],
  },
  {
    id: 'REVIEW', label: '成片审核', desc: '确认封面与字幕后完成', manual: true,
    steps: [{ id: 'REVIEW', label: '成片审核' }],
  },
  {
    id: 'PUBLISH', label: '发布分发', desc: '选择平台发布成片', manual: true,
    steps: [{ id: 'PUBLISH', label: '发布分发' }],
  },
]

const STATUS_META: Record<StepStatus, { label: string; tone: BadgeTone }> = {
  done: { label: '已完成', tone: 'success' },
  current: { label: '待确认', tone: 'primary' },
  running: { label: '执行中', tone: 'info' },
  failed: { label: '失败', tone: 'danger' },
  pending: { label: '等待', tone: 'gray' },
}

const FILE_KIND_LABEL: Record<string, string> = {
  source_video: '源视频 MP4',
  audio: '配音音频',
  avatar_video: '数字人视频',
  final: '成片 MP4',
  cover: '封面图片',
}

/** 阶段 → 主要产出文件 kind（按产出顺序） */
const PHASE_FILE_KINDS: Record<string, string[]> = {
  UNDERSTAND: ['source_video'],
  AWAITING_SCRIPT: [],
  GENERATE: ['audio', 'avatar_video', 'final', 'cover'],
  REVIEW: ['final', 'cover'],
  PUBLISH: ['final'],
}

/* ── 阶段状态聚合：自动子步骤合并 + 失败定位 ───────────── */

function computePhases(task: T): PipelinePhase[] {
  const logMap = new Map(task.logs.map((l) => [l.stage, l]))
  return PHASES.map((p) => {
    const subSteps: PhaseSubStep[] = p.steps.map((s) => {
      const log = logMap.get(s.id)
      let status: StepStatus = 'pending'
      // 任务 FAILED 时以 failed_stage 为准（worker 重启场景 stage_logs 只写了 started）
      if (task.status === 'FAILED' && s.id === task.failed_stage) status = 'failed'
      // 只有任务处于 FAILED 时才把子步骤标红；重试恢复后残留的 failed 日志视为执行中
      else if (log?.status === 'failed' && task.status === 'FAILED') status = 'failed'
      else if (log?.status === 'success') status = 'done'
      else if (log?.status === 'started' || log?.status === 'failed') status = 'running'
      // COMPLETED 时无日志的子步骤视为完成（PUBLISH 除外：完成视图展示发布卡）
      if (task.status === 'COMPLETED' && !log && p.id !== 'PUBLISH') status = 'done'
      return { ...s, status }
    })
    const failedStep = subSteps.find((s) => s.status === 'failed')
    let status: StepStatus
    if (failedStep) status = 'failed'
    else if (subSteps.every((s) => s.status === 'done') && p.id !== 'PUBLISH') status = 'done'
    else if (subSteps.some((s) => s.status === 'running')) status = 'running'
    else if (p.steps.some((s) => s.id === task.status))
      status = task.status === 'AWAITING_SCRIPT' || task.status === 'REVIEW' ? 'current' : 'running'
    else if (task.status === 'COMPLETED' && p.id === 'PUBLISH') status = 'current'
    else status = 'pending'
    return {
      id: p.id,
      label: p.label,
      desc: p.desc,
      manual: p.manual,
      status,
      subSteps,
      failedStepId: failedStep?.id ?? null,
    }
  })
}

/* ── 工作台小组件 ──────────────────────────────────────── */

const SECTION_ICONS: Record<string, ReactNode> = {
  input: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  ),
  output: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V9m0 0l-4 4m4-4l4 4M4 3h16" />
    </svg>
  ),
  adjust: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  spark: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  ),
}

/** 工作台分区卡片：输入 / 输出 / 可调整项，独立面板呈现 */
function WorkSection({ title, kind, children }: { title: string; kind: keyof typeof SECTION_ICONS; children: ReactNode }) {
  return (
    <section className="panel animate-fade-up p-4 md:p-5">
      <h3 className="panel-title text-primary-400/90">
        {SECTION_ICONS[kind]}
        {title}
      </h3>
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
    </section>
  )
}

function InputRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-panel-2/60 px-2.5 py-1.5 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 flex-1 truncate text-ink-1">{value}</span>
    </div>
  )
}

function DownloadRow({ kind, onClick }: { kind: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm text-ink-1 transition-colors hover:border-primary-400/50 hover:bg-primary-500/10"
    >
      <span className="flex items-center gap-2">
        <svg className="h-3.5 w-3.5 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
        </svg>
        {FILE_KIND_LABEL[kind] ?? kind}
      </span>
      <span className="text-xs text-ink-3">下载</span>
    </button>
  )
}

/** 子步骤明细列表（自动阶段展开/回顾视图共用） */
function SubStepList({ subSteps }: { subSteps: PhaseSubStep[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {subSteps.map((s) => (
        <div key={s.id} className="flex items-center gap-2.5 rounded-md border border-line bg-panel-2/40 px-3 py-2 text-sm">
          {s.status === 'done' ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
          ) : s.status === 'running' ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <Spinner size="xs" />
            </span>
          ) : s.status === 'failed' ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-ink-3/60" />
          )}
          <span className={`flex-1 ${s.status === 'pending' ? 'text-ink-3' : 'text-ink-1'}`}>{s.label}</span>
          {s.status === 'running' && <span className="text-xs text-info">执行中</span>}
          {s.status === 'done' && <span className="text-xs text-success">完成</span>}
          {s.status === 'failed' && <span className="text-xs text-danger">失败</span>}
        </div>
      ))}
    </div>
  )
}

/* ── 发布面板（PUBLISH 阶段） ──────────────────────────── */

const PLATFORMS = ['抖音', '快手', '视频号', 'B站']

function PublishPanel({ taskId }: { taskId: number }) {
  const [selected, setSelected] = useState<string[]>(['抖音'])
  const { toast } = useToast()

  function toggle(p: string) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-3">选择要发布的平台，一键分发成片</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={selected.includes(p)}
            onClick={() => toggle(p)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected.includes(p)
                ? 'border-primary-400 bg-primary-500/15 text-primary-300'
                : 'border-line text-ink-2 hover:border-line-strong'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <Button
        disabled={selected.length === 0}
        onClick={() => toast('success', `已提交至 ${selected.join('、')}（阶段 2 联调待接入）`)}
      >
        发布到 {selected.length} 个平台
      </Button>
      <p className="text-[10px] text-ink-3">
        关联任务 #{taskId} · 发布物料 API 将在阶段 2 实现
      </p>
    </div>
  )
}

/* ── 主组件 ────────────────────────────────────────────── */

/**
 * 任务详情页（阶段工作台模式）：
 * - 14 个流水线步骤合并为 5 个阶段，自动阶段折叠展示（进度/当前子任务/失败定位）
 * - 人工介入点（脚本确认 / 成片审核）展示输入前置产物与输出说明
 * - 桌面：左侧阶段侧栏 + 右侧工作台；手机：顶部横向阶段条 + 纵向工作台
 */
export default function TaskDetailPage() {
  const { id } = useParams()
  return (
    <AppShell activeTaskId={Number(id)}>
      <TaskDetailInner />
    </AppShell>
  )
}

function TaskDetailInner() {
  const { id } = useParams()
  const [task, setTask] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [covers, setCovers] = useState<CoverItem[]>([])
  const [coverId, setCoverId] = useState<number | null>(null)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const { toast } = useToast()

  // 任务切换时重置任务维度的本地状态，避免泄漏到下一个任务
  useEffect(() => {
    setTask(null)
    setLoading(true)
    setSelected(null)
    setCoverId(null)
    setActiveId(null)
    setCovers([])
    setFinalUrl(null)
  }, [id])

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

  // REVIEW / COMPLETED 阶段加载封面候选；任务或状态切换时重新拉取并替换旧 URL
  useEffect(() => {
    if (!task || (task.status !== 'REVIEW' && task.status !== 'COMPLETED')) {
      setCovers((prev) => {
        prev.forEach((c) => URL.revokeObjectURL(c.url))
        return []
      })
      return
    }
    let cancelled = false
    Promise.all(
      task.files
        .filter((f) => f.kind === 'cover')
        .map(async (f) => {
          const url = await fetchFileUrl(f.id).catch(() => null)
          return url ? { id: f.id, url } : null
        }),
    ).then((items) => {
      if (cancelled) {
        items.forEach((x) => x && URL.revokeObjectURL(x.url))
        return
      }
      const valid = items.filter((x): x is CoverItem => x !== null)
      setCovers((prev) => {
        prev.forEach((c) => URL.revokeObjectURL(c.url))
        return valid
      })
      setCoverId((prev) => prev ?? valid[0]?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [task?.id, task?.status])

  // REVIEW / COMPLETED 阶段加载成片预览 URL；任务或状态切换时重新拉取
  useEffect(() => {
    if (!task || (task.status !== 'REVIEW' && task.status !== 'COMPLETED')) {
      setFinalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    const final = task.files.find((f) => f.kind === 'final')
    if (!final) return
    let cancelled = false
    fetchFileUrl(final.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        setFinalUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [task?.id, task?.status])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <Skeleton lines={4} className="w-96 max-w-full" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <p className="text-ink-2">任务不存在或已被删除</p>
      </div>
    )
  }

  const rewriteScripts = task.scripts.filter((s) => s.kind === 'rewrite')
  const byKind = (k: string) => task.files.filter((f) => f.kind === k)
  const fileState = (k: string) => (byKind(k).length > 0 ? '已就绪' : '生成中…')

  const phases = computePhases(task)
  const doneCount = phases.filter((p) => p.status === 'done').length
  const progress = Math.round((doneCount / phases.length) * 100)
  const fallbackId =
    phases.find((p) => p.status === 'current')?.id ??
    phases.find((p) => p.status === 'running')?.id ??
    phases.find((p) => p.status === 'failed')?.id ??
    (task.status === 'COMPLETED' ? 'PUBLISH' : null)
  const active = phases.find((p) => p.id === (activeId ?? fallbackId)) ?? null

  const isAutoMode = !['COMPLETED', 'FAILED', 'AWAITING_SCRIPT', 'REVIEW', 'PENDING'].includes(task.status)

  /* ── 主操作按钮 ── */
  const renderAction = () => {
    // REVIEW 的确认按钮在成片审核视图输出卡内，顶部不再重复
    if (task.status === 'FAILED')
      return (
        <Button variant="danger" loading={pending} onClick={() => runAction(() => retryTask(task.id), '已从失败阶段重试')}>
          从失败阶段重试
        </Button>
      )
    return null
  }
  const action = renderAction()

  /* ── 阶段标题卡 ── */
  const renderPhaseHeader = (phase: PipelinePhase) => {
    const meta = STATUS_META[phase.status]
    return (
      <header className="panel flex animate-fade-up items-start justify-between gap-3 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <span
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${
              phase.status === 'running'
                ? 'bg-info-bg text-info'
                : phase.status === 'done'
                  ? 'bg-success-bg text-success'
                  : phase.status === 'failed'
                    ? 'bg-danger-bg text-danger'
                    : phase.status === 'current'
                      ? 'bg-primary-500/15 text-primary-300'
                      : 'bg-panel-2 text-ink-3'
            }`}
          >
            {phase.status === 'running' ? (
              <Spinner size="xs" />
            ) : phase.status === 'done' ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            ) : phase.status === 'failed' ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : phase.status === 'current' ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l2.5 2.5M12 4a8 8 0 100 16 8 8 0 000-16z" /></svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /></svg>
            )}
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-1">{phase.label}</h2>
            <p className="mt-0.5 text-xs text-ink-3">{phase.desc}</p>
          </div>
        </div>
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
      </header>
    )
  }

  /* ── 产物下载区（回顾/执行中视图共用） ── */
  const renderFiles = (phase: PipelinePhase) => {
    const kinds = PHASE_FILE_KINDS[phase.id] ?? []
    const files = kinds.flatMap((k) => byKind(k))
    if (files.length === 0)
      return <p className="text-xs text-ink-3">该阶段暂无产出文件</p>
    return files.map((f) => (
      <DownloadRow key={f.id} kind={f.kind} onClick={() => downloadFile(f.id).catch(() => setActionError('下载失败'))} />
    ))
  }

  /* ── 回顾视图（点击历史阶段：子步骤 + 产物） ── */
  const renderReview = (phase: PipelinePhase) => (
    <div className="flex flex-col gap-3 md:gap-4" key={phase.id}>
      {renderPhaseHeader(phase)}
      <WorkSection title="子步骤明细" kind="spark">
        <SubStepList subSteps={phase.subSteps} />
      </WorkSection>
      {phase.status === 'failed' && task.status === 'FAILED' && (
        <WorkSection title="失败原因" kind="adjust">
          <div className="rounded-md border border-danger/40 bg-danger-bg p-3">
            <p className="text-xs font-semibold text-danger">
              {task.failed_stage ?? phase.failedStepId ?? '未知'}（{task.error_code ?? 'UNKNOWN'}）
            </p>
            <p className="mt-0.5 break-all text-xs text-ink-2">{task.error_message}</p>
          </div>
        </WorkSection>
      )}
      <WorkSection title="阶段产物" kind="output">
        {renderFiles(phase)}
      </WorkSection>
    </div>
  )

  /* ── 执行中视图（自动阶段：当前子任务 + 已产出） ── */
  const renderRunning = (phase: PipelinePhase) => (
    <div className="flex flex-col gap-3 md:gap-4" key={phase.id}>
      {renderPhaseHeader(phase)}
      <WorkSection title="子步骤进度" kind="spark">
        <SubStepList subSteps={phase.subSteps} />
        <div className="flex items-center gap-2 rounded-md bg-info-bg px-3 py-2 text-xs text-info">
          <Spinner size="xs" color="primary" />
          <span>自动执行中，完成后自动进入下一步</span>
        </div>
      </WorkSection>
      <WorkSection title="已产出" kind="output">
        {renderFiles(phase)}
      </WorkSection>
    </div>
  )

  /* ── 脚本确认视图（人工介入点 1） ── */
  const renderScriptConfirm = () => (
    <div className="flex flex-col gap-3 md:gap-4">
      {renderPhaseHeader(active!)}
      <WorkSection title="输入 · 前置产物" kind="input">
        <InputRow label="源视频链接" value={<a href={task.source_url} target="_blank" rel="noreferrer" className="truncate text-primary-400 hover:underline">{task.source_url}</a>} />
        <InputRow label="改写脚本" value={`${rewriteScripts.length} 个候选版本`} />
        <ScriptEditor
          scripts={rewriteScripts.map((s) => ({ id: s.id, version: s.version, content: s.content, is_confirmed: s.is_confirmed }))}
          selectedId={selected}
          onSelect={setSelected}
          pending={pending}
          onConfirm={() => selected != null && runAction(() => confirmScript(task.id, selected), '脚本已确认，继续生成')}
        />
      </WorkSection>
      <WorkSection title="输出 · 确认后" kind="output">
        <p className="text-xs leading-relaxed text-ink-2">
          确认该版脚本后，流水线将自动完成：生成标题与话题、文本合规审核、语音合成、数字人成片、字幕烧录、封面生成与视频审核，随后进入成片审核等待您确认。
        </p>
        <Button loading={pending} disabled={selected == null} onClick={() => selected != null && runAction(() => confirmScript(task.id, selected), '脚本已确认，继续生成')}>
          确认并继续
        </Button>
      </WorkSection>
    </div>
  )

  /* ── 成片审核视图（人工介入点 2） ── */
  const renderReviewWorkbench = () => (
    <div className="flex flex-col gap-3 md:gap-4">
      {renderPhaseHeader(active!)}
      <WorkSection title="输入 · 前置产物" kind="input">
        <InputRow label="成片" value={fileState('final')} />
        {finalUrl && (
          <video controls className="aspect-video w-full rounded-lg bg-panel-2" src={finalUrl} />
        )}
        {byKind('cover').length > 0 && (
          <>
            <p className="mt-1 text-xs text-ink-3">封面候选（{byKind('cover').length} 张）</p>
            <CoverPicker covers={covers} selectedId={coverId} onSelect={setCoverId} />
          </>
        )}
        <p className="mt-1 text-xs text-ink-3">字幕样式</p>
        <SubtitleStylePanel />
      </WorkSection>
      <WorkSection title="输出 · 确认后" kind="output">
        <p className="text-xs leading-relaxed text-ink-2">
          确认成片与封面后，任务将标记为完成，随后可进入发布分发，选择平台一键发布。
        </p>
        <Button loading={pending} onClick={() => runAction(() => completeTask(task.id), '任务已完成')}>
          确认并完成
        </Button>
      </WorkSection>
    </div>
  )

  /* ── 完成视图（成片成果 + 发布） ── */
  const renderCompleted = () => (
    <div className="flex flex-col gap-3 md:gap-4">
      {renderPhaseHeader(active!)}
      <WorkSection title="成片成果" kind="output">
        {finalUrl && <video controls className="aspect-video w-full rounded-lg bg-panel-2" src={finalUrl} />}
        {covers.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {covers.map((c) => (
              <img key={c.id} src={c.url} alt={`封面 ${c.id}`} className="aspect-video w-full rounded-md object-cover ring-1 ring-line" />
            ))}
          </div>
        )}
        {byKind('final').map((f) => (
          <DownloadRow key={f.id} kind={f.kind} onClick={() => downloadFile(f.id).catch(() => setActionError('下载失败'))} />
        ))}
      </WorkSection>
      <WorkSection title="发布设置" kind="adjust">
        <PublishPanel taskId={task.id} />
      </WorkSection>
    </div>
  )

  /* ── 工作台主渲染：焦点阶段完整视图 / 历史阶段回顾 ── */
  const focusPhase =
    phases.find((p) => p.status === 'current') ??
    phases.find((p) => p.status === 'failed') ??
    phases.find((p) => p.status === 'running') ??
    null

  const renderWorkbench = (phase: PipelinePhase) => {
    const isFocus = focusPhase?.id === phase.id
    if (!isFocus) return renderReview(phase)
    if (phase.status === 'failed') return renderReview(phase)
    if (phase.status === 'current') {
      if (phase.id === 'AWAITING_SCRIPT' && task.status === 'AWAITING_SCRIPT') return renderScriptConfirm()
      if (phase.id === 'REVIEW' && task.status === 'REVIEW') return renderReviewWorkbench()
      if (phase.id === 'PUBLISH' && task.status === 'COMPLETED') return renderCompleted()
    }
    if (phase.status === 'running') return renderRunning(phase)
    return renderReview(phase)
  }

  /* ── 布局 ── */
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col md:h-[calc(100vh-2.75rem)]">
      {/* 任务总览卡片（状态 + 进度 + 主操作） */}
      <div className="shrink-0 px-3 pt-3 md:px-5 md:pt-4">
        <div className="panel flex animate-fade-up flex-col gap-3 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-bold text-ink-1">任务 #{task.id}</h1>
                <StatusBadge status={task.status} />
                {isAutoMode && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    自动
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-ink-3">{task.source_url}</p>
            </div>
          </div>

          {/* 进度条（阶段粒度） */}
          <div className="flex items-center gap-3 md:max-w-sm md:flex-1">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="任务进度"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"
            >
              <div
                className="h-full rounded-full bg-gradient-brand transition-all duration-slow"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-ink-3">{doneCount}/{phases.length} 阶段</span>
          </div>

          {/* 主操作（桌面） */}
          <div className="hidden shrink-0 lg:block">
            {action ?? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
                {isAutoMode && <Spinner size="xs" />}
                {isAutoMode
                  ? '流水线自动执行中'
                  : task.status === 'COMPLETED'
                    ? '已完成，可继续发布'
                    : task.status === 'FAILED'
                      ? '任务失败，可重试'
                      : '等待开始'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 主体：桌面左侧阶段面板 + 右侧工作台 */}
      <div className="flex min-h-0 flex-1">
        {/* 桌面：左侧阶段栏 */}
        <aside className="hidden w-60 shrink-0 p-3 pb-4 pl-5 lg:block xl:w-64 xl:pl-6">
          <div className="panel flex h-full flex-col overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">流水线</span>
              <span className="ml-auto text-[10px] text-ink-3">{doneCount}/{phases.length} 完成</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <PipelineSteps phases={phases} activeId={active?.id ?? null} onSelect={setActiveId} />
            </div>
          </div>
        </aside>

        {/* 右侧工作台 */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* 手机/平板端顶部阶段条 */}
          <div className="shrink-0 px-3 pt-3 lg:hidden">
            <div className="panel px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <h1 className="text-sm font-semibold text-ink-1">#{task.id}</h1>
                <StatusBadge status={task.status} />
                <span className="ml-auto flex items-center gap-2 text-[11px] text-ink-3">
                  {isAutoMode && <Spinner size="xs" />}
                  {doneCount}/{phases.length} 阶段
                </span>
              </div>
              <PipelineSteps phases={phases} activeId={active?.id ?? null} onSelect={setActiveId} compact />
            </div>
          </div>

          {actionError && (
            <div className="mx-3 mt-3 rounded-lg border border-danger/40 bg-danger-bg px-3 py-2 text-xs text-danger md:mx-5">
              {actionError}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4">
            {active ? (
              renderWorkbench(active)
            ) : (
              <div className="panel flex items-center gap-2 p-8 text-sm text-ink-3">
                <Spinner size="sm" />
                任务排队中，等待流水线启动…
              </div>
            )}
          </div>

          {/* 手机/平板端底部固定操作栏 */}
          {action && (
            <div className="shrink-0 border-t border-line bg-panel/90 p-3 backdrop-blur lg:hidden [&>button]:w-full">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
