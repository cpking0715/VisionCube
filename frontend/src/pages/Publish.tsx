import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, Modal, Select, useToast } from '../components/ui'

interface PublishPlan {
  id: number
  platform: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  taskId: number
  createdAt: string
}

const PLATFORMS = ['抖音', '快手', '视频号', 'B站']

const STATUS_META: Record<PublishPlan['status'], { label: string; tone: 'gray' | 'info' | 'success' | 'danger' }> = {
  draft: { label: '草稿', tone: 'gray' },
  scheduled: { label: '待发布', tone: 'info' },
  published: { label: '已发布', tone: 'success' },
  failed: { label: '发布失败', tone: 'danger' },
}

// 阶段 2 占位数据：后端发布物料 API 尚未实现
const MOCK_PLANS: PublishPlan[] = [
  { id: 1, platform: '抖音', status: 'published', taskId: 1, createdAt: '2026-08-08 10:20' },
  { id: 2, platform: '快手', status: 'scheduled', taskId: 1, createdAt: '2026-08-08 10:21' },
  { id: 3, platform: '视频号', status: 'draft', taskId: 2, createdAt: '2026-08-08 11:02' },
  { id: 4, platform: 'B站', status: 'failed', taskId: 3, createdAt: '2026-08-08 14:45' },
]

/**
 * 发布物料管理页（DESIGN.md §5.5.1）
 * 桌面 3 列 / 平板 2 列 / 手机单列卡片；新建发布计划弹窗（阶段 2 API 未接入，本地占位）
 */
export default function Publish() {
  const [plans, setPlans] = useState<PublishPlan[]>(MOCK_PLANS)
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [taskId, setTaskId] = useState('1')
  const [remark, setRemark] = useState('')
  const { toast } = useToast()

  function createPlan() {
    setPlans((prev) => [
      {
        id: Date.now(),
        platform,
        status: 'draft',
        taskId: Number(taskId) || 0,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      },
      ...prev,
    ])
    setOpen(false)
    setRemark('')
    toast('success', '发布计划已创建（阶段 2 联调待接入）')
  }

  return (
    <div>
      {/* 顶部工具栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-1 md:text-2xl">发布物料</h1>
          <p className="mt-1 text-sm text-ink-3">管理成片的跨平台发布计划</p>
        </div>
        <Button onClick={() => setOpen(true)}>新建发布计划</Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title="还没有发布计划"
          description="创建一条发布计划，将成片分发到各短视频平台"
          action={
            <Button onClick={() => setOpen(true)}>新建发布计划</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const meta = STATUS_META[p.status]
            return (
              <Card key={p.id} className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-ink-1">{p.platform}</p>
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-sm text-ink-2">
                  关联任务：<span className="font-medium text-ink-1">#{p.taskId}</span>
                </p>
                <p className="text-xs text-ink-3">创建于 {p.createdAt}</p>
              </Card>
            )
          })}
        </div>
      )}

      {/* 新建发布计划（阶段 2：保存后写入本地占位数据） */}
      <Modal
        open={open}
        title="新建发布计划"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={createPlan}>创建</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="发布平台"
            options={PLATFORMS.map((p) => ({ value: p, label: p }))}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
          <Select
            label="关联任务"
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `任务 #${n}` }))}
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          />
          <Input
            label="备注（可选）"
            placeholder="发布说明、封面标题等"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
