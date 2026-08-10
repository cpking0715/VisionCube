import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { listTasks, type TaskOut } from '../../api'

interface TopBarProps {
  /** 当前活跃任务 ID（用于任务切换器高亮） */
  activeTaskId?: number
}

const STATUS_SHORT: Record<string, string> = {
  PENDING: '排队中',
  PARSING: '解析中',
  TRANSCRIBING: '转写中',
  ANALYZING: '分析中',
  REWRITING: '改写中',
  AWAITING_SCRIPT: '待选脚本',
  META_GENERATING: '生成中',
  MODERATING_TEXT: '审核中',
  SYNTHESIZING: '合成中',
  GENERATING_AVATAR: '生成中',
  COMPOSING: '合成中',
  GENERATING_COVER: '生成中',
  MODERATING_VIDEO: '审核中',
  REVIEW: '待审核',
  COMPLETED: '已完成',
  FAILED: '失败',
}

/**
 * 顶部栏：Logo + 任务切换器 + 设置齿轮 + 用户头像
 * 取代旧 SideNav + TopNav，以任务流程为中心
 */
export function TopBar({ activeTaskId }: TopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // 加载任务列表（用于切换器）
  useEffect(() => {
    listTasks().then(setTasks).catch(() => {})
  }, [location.pathname])

  // 点击外部关闭下拉
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-line bg-panel/85 px-3 shadow-sm backdrop-blur-md md:h-11 md:px-4">
        {/* 左：Logo + 任务切换器 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5"
            aria-label="VisionCube 首页"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
              </svg>
            </span>
            <span className="hidden text-sm font-bold text-ink-1 sm:inline">VisionCube</span>
          </button>

          {/* 任务切换下拉 */}
          {tasks.length > 0 && (
            <div className="relative" ref={dropRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:border-primary-200 hover:bg-primary-500/10"
              >
                <svg className="h-3.5 w-3.5 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="max-w-24 truncate">
                  {activeTaskId
                    ? `#${activeTaskId}`
                    : '切换任务'}
                </span>
                <svg className="h-3 w-3 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 animate-scale-in rounded-xl border border-line bg-panel py-1 shadow-lg">
                  <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    历史任务
                  </div>
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        navigate(`/tasks/${t.id}`)
                        setDropdownOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-panel-2 ${
                        t.id === activeTaskId ? 'bg-primary-500/10 text-primary-300' : 'text-ink-1'
                      }`}
                    >
                      <span className="font-medium">#{t.id}</span>
                      <span className="rounded bg-panel-2 px-1 py-0.5 text-[10px] text-ink-2">
                        {STATUS_SHORT[t.status] ?? t.status}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink-3">{t.source_url}</span>
                    </button>
                  ))}
                  <div className="border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/')
                        setDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-primary-300 hover:bg-primary-500/10"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                      新建任务
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右：设置 + 用户 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-panel-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('vc_token')
              navigate('/login')
            }}
            aria-label="退出登录"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-300 hover:bg-primary-500/25"
          >
            {localStorage.getItem('username')?.[0]?.toUpperCase() ?? 'U'}
          </button>
        </div>
      </header>

      {/* 设置抽屉 */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute bottom-0 right-0 top-0 flex w-80 flex-col bg-panel shadow-xl sm:w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-1">设置</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-panel-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SettingsContent />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

/** 设置面板内容（内联，避免路由跳转） */
function SettingsContent() {
  const [section, setSection] = useState<'account' | 'notifications' | 'security'>('account')

  const sections = [
    { id: 'account' as const, label: '账号' },
    { id: 'notifications' as const, label: '通知' },
    { id: 'security' as const, label: '安全' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-panel-2 p-0.5">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              section === s.id ? 'bg-primary-500/15 text-primary-300 shadow-sm' : 'text-ink-2 hover:text-ink-1'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'account' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-2">用户名</span>
            <input
              className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink-1"
              value={localStorage.getItem('username') ?? 'admin'}
              readOnly
            />
          </label>
        </div>
      )}
      {section === 'notifications' && (
        <div className="flex flex-col gap-3">
          {['任务完成通知', '审核结果通知'].map((label) => (
            <label key={label} className="flex items-center justify-between">
              <span className="text-sm text-ink-1">{label}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-line text-primary-500" />
            </label>
          ))}
        </div>
      )}
      {section === 'security' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-3">密码修改与 API 密钥管理将在阶段 2 实现</p>
        </div>
      )}
    </div>
  )
}
