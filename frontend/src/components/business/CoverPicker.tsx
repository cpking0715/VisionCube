export interface CoverItem {
  id: number
  url: string
  label?: string
}

interface CoverPickerProps {
  covers: CoverItem[]
  selectedId: number | null
  onSelect: (id: number) => void
}

/**
 * 封面候选网格选择器（DESIGN.md §3.5.5，REVIEW 阶段）
 * 桌面 3 列 / 平板 2 列 / 手机 1 列；选中态 primary-500 边框 + 左上角勾选
 */
export function CoverPicker({ covers, selectedId, onSelect }: CoverPickerProps) {
  if (covers.length === 0) {
    return <p className="py-4 text-sm text-ink-3">暂无封面候选</p>
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {covers.map((c) => {
        const active = selectedId === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={active}
            className={`relative overflow-hidden rounded-md border-2 transition-all duration-fast ${
              active ? 'border-primary-500 shadow-md' : 'border-transparent hover:border-primary-200'
            }`}
          >
            <img
              src={c.url}
              alt={c.label ?? `封面 ${c.id}`}
              className="aspect-video w-full object-cover"
            />
            {active && (
              <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white shadow">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {c.label && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-left text-xs text-white">
                {c.label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
