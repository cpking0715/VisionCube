import { useState } from 'react'

export interface SubtitleStyle {
  preset: string
  fontSize: number
  color: string
  stroke: boolean
  position: 'top' | 'middle' | 'bottom'
}

const PRESETS = [
  { id: 'none', label: '无字幕', color: '#FFFFFF', stroke: false },
  { id: 'white', label: '白字黑描边', color: '#FFFFFF', stroke: true },
  { id: 'yellow', label: '黄字黑描边', color: '#FACC15', stroke: true },
  { id: 'black', label: '黑字白底', color: '#111827', stroke: false },
]

const COLORS = ['#FFFFFF', '#FACC15', '#111827', '#4F46E5', '#10B981']

const POSITIONS: { id: SubtitleStyle['position']; label: string }[] = [
  { id: 'top', label: '顶部' },
  { id: 'middle', label: '居中' },
  { id: 'bottom', label: '底部' },
]

const DEFAULT_STYLE: SubtitleStyle = {
  preset: 'white',
  fontSize: 32,
  color: '#FFFFFF',
  stroke: true,
  position: 'bottom',
}

interface SubtitleStylePanelProps {
  initial?: SubtitleStyle
  onChange?: (style: SubtitleStyle) => void
}

/**
 * 字幕样式编辑面板（DESIGN.md §3.5.6，REVIEW 阶段）
 * 桌面：左右分栏（预设网格 + 微调）；手机：上下堆叠（预设横向滚动 + 微调表单）
 * 注：样式实际应用到成片需阶段 2 API，当前仅本地编辑预览
 */
export function SubtitleStylePanel({ initial, onChange }: SubtitleStylePanelProps) {
  const [style, setStyle] = useState<SubtitleStyle>(initial ?? DEFAULT_STYLE)

  function update(next: Partial<SubtitleStyle>) {
    const merged = { ...style, ...next }
    setStyle(merged)
    onChange?.(merged)
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    update({ preset: id, color: preset.color, stroke: preset.stroke })
  }

  const presets = (
    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => applyPreset(p.id)}
          className={`shrink-0 rounded-md border px-4 py-2 text-sm transition-colors ${
            style.preset === p.id
              ? 'border-primary-500 bg-primary-500/15 text-primary-300'
              : 'border-line text-ink-2 hover:border-primary-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  const controls = (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-1">字号（{style.fontSize}px）</span>
        <input
          type="range"
          min={18}
          max={64}
          value={style.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="accent-primary-500"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-1">颜色</span>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`颜色 ${c}`}
              onClick={() => update({ color: c })}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                style.color === c ? 'scale-110 border-primary-500' : 'border-line'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-1">位置</span>
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ position: p.id })}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                style.position === p.id
                  ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                  : 'border-line text-ink-2'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-1">
        <input
          type="checkbox"
          checked={style.stroke}
          onChange={(e) => update({ stroke: e.target.checked })}
          className="h-4 w-4 accent-primary-500"
        />
        文字描边
      </label>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
      <div>
        <p className="mb-2 text-xs font-medium text-ink-3">预设样式</p>
        {presets}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-ink-3">微调</p>
        {controls}
      </div>
    </div>
  )
}
