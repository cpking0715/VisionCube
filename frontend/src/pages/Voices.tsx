import { useState } from 'react'
import { Button, Dialog, EmptyState, useToast } from '../components/ui'

interface Voice {
  id: number
  name: string
  language: string
  duration: string
  clone: boolean
}

// 阶段 2 占位数据：后端音色 API 尚未实现
const MOCK_VOICES: Voice[] = [
  { id: 1, name: '温柔女声', language: '中文', duration: '1分20秒', clone: true },
  { id: 2, name: '磁性男声', language: '中文', duration: '2分05秒', clone: true },
  { id: 3, name: '活力少女', language: '中文', duration: '58秒', clone: false },
  { id: 4, name: '美式英语', language: '英文', duration: '1分30秒', clone: false },
]

/**
 * 音色管理页（DESIGN.md §5.5.3）
 * 桌面/平板：表格（名称/语言/时长/操作）+ 上传克隆；手机：卡片列表
 */
export default function Voices() {
  const [voices, setVoices] = useState<Voice[]>(MOCK_VOICES)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { toast } = useToast()

  const deleting = voices.find((v) => v.id === deleteId)

  function confirmDelete() {
    if (deleteId == null) return
    setVoices((prev) => prev.filter((v) => v.id !== deleteId))
    setDeleteId(null)
    toast('success', '音色已删除')
  }

  // 表格操作按钮（桌面/平板）
  const tableActions = (v: Voice) => (
    <div className="flex gap-1.5">
      <Button variant="ghost" size="sm" onClick={() => toast('info', '试听功能将在阶段 2 上线')}>
        试听
      </Button>
      <Button variant="ghost" size="sm" onClick={() => toast('info', '克隆功能将在阶段 2 上线')}>
        克隆
      </Button>
      <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-bg" onClick={() => setDeleteId(v.id)}>
        删除
      </Button>
    </div>
  )

  return (
    <div>
      {/* 顶部工具栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-1 md:text-2xl">音色管理</h1>
          <p className="mt-1 text-sm text-ink-3">管理配音音色与克隆音色</p>
        </div>
        <Button onClick={() => toast('info', '上传克隆功能将在阶段 2 上线')}>上传克隆</Button>
      </div>

      {voices.length === 0 ? (
        <EmptyState title="还没有音色" description="上传一段音频，克隆你的专属音色" />
      ) : (
        <>
          {/* 桌面/平板：表格 */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2 text-left text-ink-2">
                  <th className="px-4 py-3 font-medium">音色名称</th>
                  <th className="px-4 py-3 font-medium">语言</th>
                  <th className="px-4 py-3 font-medium">时长</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {voices.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-panel-2/60">
                    <td className="px-4 py-3 font-medium text-ink-1">{v.name}</td>
                    <td className="px-4 py-3 text-ink-2">{v.language}</td>
                    <td className="px-4 py-3 text-ink-2">{v.duration}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-sm bg-panel-2 px-2 py-0.5 text-xs text-ink-2">
                        {v.clone ? '克隆' : '系统'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{tableActions(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 手机：卡片列表 */}
          <div className="flex flex-col gap-3 md:hidden">
            {voices.map((v) => (
              <div key={v.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-1">{v.name}</p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {v.language} · {v.duration} · {v.clone ? '克隆' : '系统'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => toast('info', '试听功能将在阶段 2 上线')}>
                    播放
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-bg" onClick={() => setDeleteId(v.id)}>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 删除二次确认（DESIGN.md §6.4） */}
      <Dialog
        open={deleteId != null}
        title="删除音色"
        description={`确定删除「${deleting?.name ?? ''}」吗？该操作不可撤销。`}
        confirmText="删除"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
