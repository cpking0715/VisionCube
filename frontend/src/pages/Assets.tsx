import { useState } from 'react'
import { AssetPicker, type AssetCategory, type AssetItem } from '../components/business'

const CATEGORIES: AssetCategory[] = [
  { id: 'all', label: '全部' },
  { id: 'audio', label: '音频' },
  { id: 'video', label: '视频' },
  { id: 'image', label: '图片' },
  { id: 'font', label: '字体' },
]

// 阶段 2 占位数据：后端资产 API 尚未实现
const MOCK_ASSETS: AssetItem[] = [
  { id: 1, name: '爆款BGM-热血', kind: 'audio', size: '3.2 MB' },
  { id: 2, name: '卡点音效-鼓点', kind: 'audio', size: '420 KB' },
  { id: 3, name: '城市夜景空镜', kind: 'video', size: '24.5 MB' },
  { id: 4, name: '春日花园空镜', kind: 'video', size: '18.2 MB' },
  { id: 5, name: '产品主图-左45°', kind: 'image', size: '860 KB' },
  { id: 6, name: '封面底图-渐变', kind: 'image', size: '1.1 MB' },
  { id: 7, name: '思源黑体-Bold', kind: 'font', size: '12.8 MB' },
  { id: 8, name: '阿里巴巴普惠体', kind: 'font', size: '8.6 MB' },
]

/**
 * 资产库页（DESIGN.md §5.5.2）
 * 桌面：左侧分类导航 + AssetPicker（4 列）；平板/手机：顶部分类 Tab + AssetPicker（3 列 / 1 列）
 */
export default function Assets() {
  const [category, setCategory] = useState('all')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink-1 md:text-2xl">资产库</h1>
        <p className="mt-1 text-sm text-ink-3">管理音频、视频、图片与字体素材</p>
      </div>

      <div className="lg:flex lg:gap-6">
        {/* 桌面左侧分类导航（仅 lg+） */}
        <nav className="hidden w-44 shrink-0 flex-col gap-1 lg:flex" aria-label="素材分类">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                category === cat.id
                  ? 'bg-primary-500/15 text-primary-300'
                  : 'text-ink-2 hover:bg-panel-2 hover:text-ink-1'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* 平板/手机顶部分类 Tab（<lg）+ 素材区 */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  category === cat.id
                    ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                    : 'border-line text-ink-2 hover:border-primary-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <AssetPicker
            assets={MOCK_ASSETS}
            categories={CATEGORIES}
            activeCategory={category}
            onCategoryChange={setCategory}
            showCategories={false}
          />
        </div>
      </div>
    </div>
  )
}
