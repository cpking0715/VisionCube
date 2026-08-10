/** 阶段中文标签（StageLog.stage 为 TaskStatus 枚举值，大写） */
const STAGE_LABELS: Record<string, string> = {
  PENDING: '等待开始',
  PARSING: '解析视频',
  TRANSCRIBING: '语音转写',
  ANALYZING: '内容分析',
  REWRITING: '脚本改写',
  AWAITING_SCRIPT: '等待选稿',
  META_GENERATING: '元信息生成',
  MODERATING_TEXT: '文本审核',
  SYNTHESIZING: '语音合成',
  GENERATING_AVATAR: '数字人生成',
  COMPOSING: '视频合成',
  GENERATING_COVER: '封面生成',
  MODERATING_VIDEO: '视频审核',
  REVIEW: '等待审核',
  COMPLETED: '已完成',
}

const STAGE_ORDER = [
  'PARSING',
  'TRANSCRIBING',
  'ANALYZING',
  'REWRITING',
  'AWAITING_SCRIPT',
  'META_GENERATING',
  'MODERATING_TEXT',
  'SYNTHESIZING',
  'GENERATING_AVATAR',
  'COMPOSING',
  'GENERATING_COVER',
  'MODERATING_VIDEO',
  'REVIEW',
]

export interface StageLogItem {
  stage: string
  status: 'started' | 'success' | 'failed' | string
  created_at?: string
}

/**
 * 阶段时间线（DESIGN.md §3.5.3）
 * 桌面：垂直时间线；手机：水平滚动 + 底部状态点
 */
export function StageTimeline({ logs }: { logs: StageLogItem[] }) {
  if (logs.length === 0) {
    return <p className="py-4 text-center text-sm text-ink-3">暂无阶段记录</p>
  }
  const byStage = new Map<string, StageLogItem>()
  for (const log of logs) byStage.set(log.stage, log)

  return (
    <ol className="flex flex-row gap-4 overflow-x-auto pb-2 md:flex-col md:gap-0">
      {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage, i) => {
        const log = byStage.get(stage)!
        const isLast = i === STAGE_ORDER.filter((s) => byStage.has(s)).length - 1
        const dotColor =
          log.status === 'success'
            ? 'bg-success'
            : log.status === 'failed'
              ? 'bg-danger'
              : log.status === 'started'
                ? 'bg-info'
                : 'bg-ink-3'
        return (
          <li key={stage} className="flex min-w-32 shrink-0 flex-col md:min-w-0 md:flex-row">
            {/* 状态点 + 连线 */}
            <div className="flex items-center gap-2 md:flex-col md:items-stretch md:gap-0">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
              {!isLast && (
                <span className="h-px w-8 bg-line md:h-8 md:w-px md:self-center" />
              )}
            </div>
            {/* 内容 */}
            <div className={`-mt-1 pb-1 md:pb-4 ${isLast ? '' : 'md:-mt-3 md:ml-4'}`}>
              <p className="text-sm font-medium text-ink-1">{STAGE_LABELS[stage] ?? stage}</p>
              <p className="text-xs text-ink-3">
                {log.status === 'started' && '进行中'}
                {log.status === 'success' && '已完成'}
                {log.status === 'failed' && '失败'}
                {log.created_at && ` · ${new Date(log.created_at).toLocaleTimeString()}`}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
