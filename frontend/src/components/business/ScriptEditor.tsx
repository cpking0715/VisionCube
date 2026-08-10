import { useState } from 'react'
import { Button } from '../ui/Button'

export interface ScriptItem {
  id: number
  version: number
  content: string
  is_confirmed?: boolean
}

interface ScriptEditorProps {
  scripts: ScriptItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onConfirm: () => void
  pending?: boolean
  emptyHint?: string
}

/**
 * 脚本编辑器（DESIGN.md §3.5.4，AWAITING_SCRIPT 阶段）
 * 桌面：双栏（左列表 + 右预览）；平板：上下堆叠；手机：Tab 切换
 * 注：脚本文本编辑保存需阶段 2 API，当前为只读预览
 */
export function ScriptEditor({
  scripts,
  selectedId,
  onSelect,
  onConfirm,
  pending = false,
  emptyHint = '暂无备选脚本',
}: ScriptEditorProps) {
  const [mobileTab, setMobileTab] = useState<'list' | 'preview'>('list')
  const selected = scripts.find((s) => s.id === selectedId) ?? null

  const list = (
    <div className="flex flex-col gap-2">
      {scripts.length === 0 && <p className="py-4 text-sm text-ink-3">{emptyHint}</p>}
      {scripts.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={`flex items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
            selectedId === s.id
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-line hover:border-primary-200'
          }`}
        >
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              selectedId === s.id ? 'border-primary-500 bg-primary-500' : 'border-ink-3'
            }`}
          >
            {selectedId === s.id && <span className="h-2 w-2 rounded-full bg-white" />}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-ink-1">V{s.version}</span>
            <span className="mt-0.5 line-clamp-2 block text-ink-2">{s.content}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const preview = (
    <div className="flex min-h-48 flex-col rounded-md border border-line bg-panel-2">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-xs font-medium text-ink-2">
          {selected ? `V${selected.version} 预览` : '未选择脚本'}
        </span>
        {selected && (
          <span className="text-xs text-ink-3">
            {selected.is_confirmed ? '已确认' : '草稿'}
          </span>
        )}
      </div>
      {selected ? (
        <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-sans text-sm leading-6 text-ink-1">
          {selected.content}
        </pre>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-3">
          从左侧选择一个脚本版本
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* 手机：Tab 切换 */}
      <div className="flex rounded-md border border-line p-0.5 md:hidden">
        {(['list', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
              mobileTab === tab ? 'bg-primary-500 text-white' : 'text-ink-2'
            }`}
          >
            {tab === 'list' ? '选择脚本' : '编辑/预览'}
          </button>
        ))}
      </div>

      {/* 手机：按 Tab 显示；平板/桌面：上下堆叠 / 左右分栏 */}
      <div className="md:hidden">{mobileTab === 'list' ? list : preview}</div>
      <div className="hidden flex-col gap-3 md:flex lg:grid lg:grid-cols-2 lg:gap-4">
        {list}
        {preview}
      </div>

      <Button disabled={selectedId == null || pending} loading={pending} onClick={onConfirm}>
        确认该版脚本
      </Button>
    </div>
  )
}
