import { useState } from 'react'
import { Button, Card, Dialog, Input, useToast } from '../components/ui'

type SectionId = 'account' | 'notifications' | 'security' | 'api'

const SECTIONS: { id: SectionId; label: string; desc: string }[] = [
  { id: 'account', label: '账号', desc: '管理用户名与邮箱' },
  { id: 'notifications', label: '通知', desc: '管理消息推送偏好' },
  { id: 'security', label: '安全', desc: '修改密码与会话' },
  { id: 'api', label: 'API', desc: '查看与管理 API 密钥' },
]

const NOTIFY_ITEMS = [
  { id: 'task_done', label: '任务完成通知', desc: '复刻任务进入审核或完成时提醒' },
  { id: 'review', label: '审核结果通知', desc: '封面/字幕审核有结果时提醒' },
  { id: 'product', label: '产品更新推送', desc: '新功能与版本更新通知' },
]

/**
 * 设置页（DESIGN.md §5.5.4）
 * 桌面/平板：左侧分类导航 + 右侧表单；手机：垂直列表点击切换
 * 阶段 2：表单仅本地状态，保存与 API 密钥操作待后端接入
 */
export default function Settings() {
  const [section, setSection] = useState<SectionId>('account')
  const [username, setUsername] = useState('admin')
  const [email, setEmail] = useState('admin@visioncube.dev')
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    task_done: true,
    review: true,
    product: false,
  })
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const { toast } = useToast()

  const apiKey = 'vc_live_8f3a1c9e2b7d4a60'

  function save(msg: string) {
    toast('success', msg)
  }

  function copyKey() {
    navigator.clipboard
      .writeText(apiKey)
      .then(() => toast('success', 'API Key 已复制'))
      .catch(() => toast('error', '复制失败，请手动复制'))
  }

  // 各分类表单（手机端点击导航切换展示）
  const forms: Record<SectionId, React.ReactNode> = {
    account: (
      <div className="flex max-w-md flex-col gap-4">
        <Input label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Button onClick={() => save('账号信息已保存')}>保存修改</Button>
        </div>
      </div>
    ),
    notifications: (
      <div className="flex max-w-md flex-col gap-3">
        {NOTIFY_ITEMS.map((n) => (
          <label key={n.id} className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-line p-4">
            <div>
              <p className="text-sm font-medium text-ink-1">{n.label}</p>
              <p className="mt-0.5 text-xs text-ink-3">{n.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={notifications[n.id]}
              onChange={(e) => setNotifications((prev) => ({ ...prev, [n.id]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-primary-500"
            />
          </label>
        ))}
        <div>
          <Button onClick={() => save('通知偏好已保存')}>保存修改</Button>
        </div>
      </div>
    ),
    security: (
      <div className="flex max-w-md flex-col gap-4">
        <Input label="当前密码" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
        <Input label="新密码" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        <Input
          label="确认新密码"
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          error={confirmPwd && confirmPwd !== newPwd ? '两次输入的新密码不一致' : undefined}
        />
        <div>
          <Button onClick={() => save('密码已更新')}>更新密码</Button>
        </div>
      </div>
    ),
    api: (
      <div className="flex max-w-md flex-col gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-ink-1">API Key</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={showKey ? apiKey : 'vc_live_••••••••••••••••'}
              aria-label="API Key"
              className="font-mono text-xs"
            />
            <Button variant="secondary" onClick={() => setShowKey((v) => !v)}>
              {showKey ? '隐藏' : '显示'}
            </Button>
            <Button variant="secondary" onClick={copyKey}>
              复制
            </Button>
          </div>
          <p className="mt-1 text-xs text-ink-3">用于调用自动化接口，请勿泄露给他人</p>
        </div>
        <div>
          <Button variant="danger" onClick={() => setRegenerateOpen(true)}>
            重新生成
          </Button>
        </div>
      </div>
    ),
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink-1 md:text-2xl">设置</h1>
        <p className="mt-1 text-sm text-ink-3">管理账号、通知、安全与 API</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* 分类导航 */}
        <nav className="flex flex-col gap-1 md:col-span-1" aria-label="设置分类">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded-md px-3 py-2.5 text-left transition-colors ${
                section === s.id
                  ? 'bg-primary-500/15 text-primary-300'
                  : 'text-ink-2 hover:bg-panel-2 hover:text-ink-1'
              }`}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className={`mt-0.5 text-xs ${section === s.id ? 'text-primary-400' : 'text-ink-3'}`}>{s.desc}</p>
            </button>
          ))}
        </nav>

        {/* 表单区 */}
        <Card className="p-6 md:col-span-3">
          <h2 className="mb-5 text-sm font-semibold text-ink-1">
            {SECTIONS.find((s) => s.id === section)?.label}
          </h2>
          {forms[section]}
        </Card>
      </div>

      {/* 重新生成 API Key 二次确认 */}
      <Dialog
        open={regenerateOpen}
        title="重新生成 API Key"
        description="旧的 API Key 将立即失效，使用它的自动化脚本会中断。确定继续吗？"
        confirmText="重新生成"
        danger
        onConfirm={() => {
          setRegenerateOpen(false)
          toast('success', 'API Key 已重新生成（阶段 2 联调待接入）')
        }}
        onCancel={() => setRegenerateOpen(false)}
      />
    </div>
  )
}
