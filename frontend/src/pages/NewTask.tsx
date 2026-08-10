import { useEffect, useState } from 'react'
import { listTasks, type TaskOut } from '../api'
import { AppShell } from '../components/layout'
import { CreateTaskWizard, HowItWorks, StatCard, TaskListCard } from '../components/business'

/** 需要人工介入的暂停态（归入"待审核"） */
const MANUAL_STATES = new Set(['AWAITING_SCRIPT', 'REVIEW'])
/** 终态（不归入"执行中"） */
const FINAL_STATES = new Set(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])

const ICONS = {
  all: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  running: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l2.5 2.5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  review: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v6h4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  done: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
}

/** 卡片工作台首页：欢迎横幅 + 统计卡 + 创建任务 + 最近任务 + 工作流说明 */
export default function NewTask() {
  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const running = tasks.filter((t) => !MANUAL_STATES.has(t.status) && !FINAL_STATES.has(t.status)).length
  const reviewing = tasks.filter((t) => MANUAL_STATES.has(t.status)).length
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* ── 欢迎横幅 ── */}
        <section
          className="relative animate-fade-up overflow-hidden rounded-2xl shadow-card"
          aria-label="欢迎"
        >
          <img
            src="/hero-bg.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/85 via-primary-700/60 to-secondary-500/10" />
          <div className="relative flex flex-col gap-4 px-5 py-8 sm:px-8 sm:py-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary-200">
                VisionCube Studio
              </p>
              <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                你好，创作者
              </h1>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-primary-100/90">
                粘贴一条抖音链接，自动解析、改写脚本、生成数字人成片，一键发布
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                document
                  .querySelector('[data-create-task]')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-brand px-5 text-sm font-semibold text-white shadow-md transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              开始新任务
            </button>
          </div>
        </section>

        {/* ── 统计卡片 ── */}
        <section className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-4 md:gap-4">
          <StatCard label="全部任务" value={loaded ? tasks.length : 0} icon={ICONS.all} tone="primary" delay={40} />
          <StatCard label="执行中" value={running} icon={ICONS.running} tone="info" delay={80} />
          <StatCard label="待审核" value={reviewing} icon={ICONS.review} tone="warning" delay={120} />
          <StatCard label="已完成" value={completed} icon={ICONS.done} tone="success" delay={160} />
        </section>

        {/* ── 主工作区：创建任务 + 最近任务 ── */}
        <section className="mt-4 grid items-start gap-4 md:mt-5 lg:grid-cols-3">
          <div data-create-task className="scroll-mt-16 lg:col-span-2">
            <CreateTaskWizard />
          </div>
          <TaskListCard tasks={tasks} />
        </section>

        {/* ── 工作流说明 ── */}
        <section className="mt-4 grid gap-3 md:mt-5 md:grid-cols-3 md:gap-4">
          <HowItWorks />
        </section>
      </div>
    </AppShell>
  )
}
