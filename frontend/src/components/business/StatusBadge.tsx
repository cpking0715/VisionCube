import { Badge, type BadgeTone } from '../ui/Badge'

/** 状态机 16 态中文标签（后端 TaskStatus 枚举值） */
const STATUS_LABELS: Record<string, string> = {
  PENDING: '等待开始',
  PARSING: '解析中',
  TRANSCRIBING: '转写中',
  ANALYZING: '分析中',
  REWRITING: '改写中',
  AWAITING_SCRIPT: '待选脚本',
  META_GENERATING: '元信息生成',
  MODERATING_TEXT: '文本审核',
  SYNTHESIZING: '语音合成',
  GENERATING_AVATAR: '数字人生成',
  COMPOSING: '合成中',
  GENERATING_COVER: '封面生成',
  MODERATING_VIDEO: '视频审核',
  REVIEW: '待审核',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
}

/** 状态颜色映射（DESIGN.md §2.1.5） */
const STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: 'gray',
  PARSING: 'info',
  TRANSCRIBING: 'info',
  ANALYZING: 'info',
  REWRITING: 'info',
  AWAITING_SCRIPT: 'warning',
  META_GENERATING: 'info',
  MODERATING_TEXT: 'info',
  SYNTHESIZING: 'info',
  GENERATING_AVATAR: 'info',
  COMPOSING: 'info',
  GENERATING_COVER: 'info',
  MODERATING_VIDEO: 'info',
  REVIEW: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'gray',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

/** 状态徽章（DESIGN.md §3.5.2）：16 态颜色映射 + 中文标签 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'gray'} dot className={className}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
