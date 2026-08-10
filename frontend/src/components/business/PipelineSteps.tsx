import { Spinner } from '../ui'

export type StepStatus = 'done' | 'current' | 'running' | 'failed' | 'pending'

/** 阶段内子步骤（自动阶段折叠时用于明细/失败定位） */
export interface PhaseSubStep {
  id: string
  label: string
  status: StepStatus
}

/** 流水线阶段（自动步骤合并后的顶层节点） */
export interface PipelinePhase {
  id: string
  label: string
  desc: string
  /** 是否需要人工介入 */
  manual: boolean
  status: StepStatus
  subSteps: PhaseSubStep[]
  /** 失败定位：具体子步骤 id */
  failedStepId?: string | null
  time?: string
}

interface PipelineStepsProps {
  phases: PipelinePhase[]
  activeId: string | null
  onSelect: (id: string) => void
  /** 紧凑横向模式（手机端顶部步骤条） */
  compact?: boolean
}

const STATUS_TEXT: Record<StepStatus, string> = {
  done: '已完成',
  current: '待确认',
  running: '执行中',
  failed: '失败',
  pending: '等待',
}

const ICON_CLASS: Record<StepStatus, string> = {
  done: 'bg-success',
  current: 'bg-primary-500 ring-4 ring-primary-500/20',
  running: 'bg-info',
  failed: 'bg-danger',
  pending: 'border border-line bg-panel-2',
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'running')
    return (
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
        <Spinner size="xs" color="white" />
      </span>
    )
  if (status === 'done')
    return (
      <svg
        className="h-3.5 w-3.5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  if (status === 'failed')
    return (
      <svg
        className="h-3.5 w-3.5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  if (status === 'current')
    return (
      // 手掌图标表示需要人工确认
      <svg
        className="h-3 w-3 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8" />
        <path d="M18 8a2 2 0 012 2v7.4a8 8 0 01-5.13 7.46A6 6 0 016 19.13L4.14 13.6a2 2 0 013.53-1.87L10 15" />
      </svg>
    )
  return <span className="h-2 w-2 rounded-full bg-ink-3" />
}

/** 自动阶段摘要行：折叠态显示子步骤进度/当前任务/失败定位 */
function PhaseSummary({ phase }: { phase: PipelinePhase }) {
  const total = phase.subSteps.length
  const doneCount = phase.subSteps.filter((s) => s.status === 'done').length
  if (phase.status === 'running') {
    const current = phase.subSteps.find((s) => s.status === 'running')
    if (current)
      return <span className="mt-0.5 block truncate text-xs text-info">当前：{current.label}</span>
    return <span className="mt-0.5 block text-xs text-info">执行中…</span>
  }
  if (phase.status === 'failed' && phase.failedStepId) {
    const failed = phase.subSteps.find((s) => s.id === phase.failedStepId)
    return <span className="mt-0.5 block truncate text-xs text-danger">失败于：{failed?.label ?? phase.failedStepId}</span>
  }
  if (phase.status === 'done' && !phase.manual)
    return <span className="mt-0.5 block text-xs text-ink-3">已自动完成 {doneCount}/{total} 子步骤</span>
  return null
}

/**
 * 流程阶段条（工作台式布局左侧）：
 * - 自动步骤合并为阶段节点，折叠展示摘要（进度/当前子任务/失败定位）
 * - 人工阶段（manual）在 current 时显示"需确认"标识
 * - 桌面：垂直列表；手机：横向滚动胶囊
 */
export function PipelineSteps({ phases, activeId, onSelect, compact }: PipelineStepsProps) {
  if (compact) {
    return (
      <ol className="flex gap-1 overflow-x-auto pb-1">
        {phases.map((p) => {
          const clickable = p.status === 'done' || p.status === 'failed'
          const active = p.id === activeId
          return (
            <li key={p.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={!clickable && !active}
                onClick={() => onSelect(p.id)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                  active
                    ? 'bg-primary-500/15 text-primary-300 font-medium ring-1 ring-primary-500/30'
                    : p.status === 'done'
                      ? 'text-success'
                      : p.status === 'running'
                        ? 'text-info'
                        : p.status === 'failed'
                          ? 'text-danger'
                          : 'text-ink-3'
                } ${clickable ? 'hover:bg-panel-2' : ''}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    p.status === 'done'
                      ? 'bg-success'
                      : p.status === 'running'
                        ? 'bg-info'
                        : p.status === 'failed'
                          ? 'bg-danger'
                          : p.status === 'current'
                            ? 'bg-primary-400'
                            : 'bg-ink-3'
                  }`}
                />
                {p.label}
                {p.status === 'running' && (
                  <span className="max-w-16 truncate text-[10px] text-ink-3">
                    {p.subSteps.find((s) => s.status === 'running')?.label ?? ''}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <ol className="flex flex-col gap-0">
      {phases.map((p, i) => {
        const isLast = i === phases.length - 1
        const clickable = p.status === 'done' || p.status === 'failed'
        const active = p.id === activeId
        return (
          <li key={p.id} className="flex items-stretch gap-2.5">
            {/* 状态图标 + 连线 */}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${ICON_CLASS[p.status]}`}
              >
                <StatusIcon status={p.status} />
              </span>
              {!isLast && (
                <span className={`w-px flex-1 ${p.status === 'done' ? 'bg-success/40' : 'bg-line'}`} />
              )}
            </div>
            {/* 阶段内容 */}
            <button
              type="button"
              disabled={!clickable && !active}
              onClick={() => onSelect(p.id)}
              className={`mb-2 flex-1 rounded-lg px-3 py-1.5 text-left transition-all ${
                active
                  ? p.manual
                    ? 'bg-primary-500/10 ring-1 ring-primary-500/30 shadow-sm'
                    : 'bg-panel-2 ring-1 ring-line-strong'
                  : clickable
                    ? 'hover:bg-panel-2'
                    : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`block text-sm font-medium leading-tight ${
                    active
                      ? 'text-ink-1'
                      : p.status === 'pending'
                        ? 'text-ink-3'
                        : 'text-ink-1'
                  }`}
                >
                  {p.label}
                </span>
                {/* 自动/手动标识 */}
                {p.status === 'running' && (
                  <span className="rounded bg-info/10 px-1 py-0.5 text-[10px] font-medium text-info">
                    自动
                  </span>
                )}
                {p.status === 'current' && p.manual && (
                  <span className="rounded bg-primary-500/15 px-1 py-0.5 text-[10px] font-medium text-primary-300">
                    需确认
                  </span>
                )}
              </div>
              <span className="mt-0.5 block truncate text-xs text-ink-3">{p.desc}</span>
              <PhaseSummary phase={p} />
              <span className="mt-0.5 block text-[11px] text-ink-3">
                {STATUS_TEXT[p.status]}
                {p.time && ` · ${new Date(p.time).toLocaleTimeString()}`}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
