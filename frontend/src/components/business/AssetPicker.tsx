import { useState } from 'react'

export interface AssetItem {
  id: number
  name: string
  kind: 'video' | 'audio' | 'image' | 'font'
  size: string
  url?: string
}

export interface AssetCategory {
  id: string // 'all' 或素材 kind
  label: string
}

interface AssetPickerProps {
  assets: AssetItem[]
  categories?: AssetCategory[]
  activeCategory?: string
  onCategoryChange?: (cat: string) => void
  /** 是否渲染内置分类 Tab（资产库页桌面端由页面自绘左侧导航时传 false） */
  showCategories?: boolean
}

/**
 * 素材选择器（DESIGN.md §3.5.7）
 * 搜索框 + 分类筛选 + 网格/列表切换；桌面 4 列 / 平板 3 列 / 手机 1 列
 */
export function AssetPicker({
  assets,
  categories = [{ id: 'all', label: '全部' }],
  activeCategory = 'all',
  onCategoryChange,
  showCategories = true,
}: AssetPickerProps) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filtered = assets.filter((a) => {
    const matchCat = activeCategory === 'all' || a.kind === activeCategory
    const matchQuery = a.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQuery
  })

  const kindLabel: Record<AssetItem['kind'], string> = {
    video: '视频',
    audio: '音频',
    image: '图片',
    font: '字体',
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 工具栏：搜索 + 视图切换 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="input pl-9"
            placeholder="搜索素材名称…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索素材"
          />
        </div>
        <div className="flex rounded-md border border-line p-0.5">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={v === 'grid' ? '网格视图' : '列表视图'}
              className={`flex h-8 w-8 items-center justify-center rounded-sm ${
                view === v ? 'bg-primary-500/15 text-primary-300' : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              {v === 'grid' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 分类 Tab：手机横向滚动；平板/桌面完整显示（showCategories=false 时由页面自绘） */}
      {showCategories && (
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange?.(cat.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                activeCategory === cat.id
                  ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                  : 'border-line text-ink-2 hover:border-primary-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* 素材列表 */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-3">
          {query ? `未找到与"${query}"匹配的素材` : '该分类下暂无素材'}
        </p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => (
            <div key={a.id} className="group card overflow-hidden">
              <div className="flex aspect-video items-center justify-center bg-panel-2 text-ink-3">
                {a.kind === 'image' && a.url ? (
                  <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-medium">{kindLabel[a.kind]}</span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-ink-1">{a.name}</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {kindLabel[a.kind]} · {a.size}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-1">{a.name}</p>
                <p className="text-xs text-ink-3">
                  {kindLabel[a.kind]} · {a.size}
                </p>
              </div>
              <span className="ml-3 shrink-0 rounded-sm bg-panel-2 px-2 py-0.5 text-xs text-ink-2">
                {kindLabel[a.kind]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
