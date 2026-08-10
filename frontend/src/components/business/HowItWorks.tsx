import { type ReactNode } from 'react'

interface HowItem {
  icon: ReactNode
  title: string
  desc: string
  tag: string
}

const ITEMS: HowItem[] = [
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: '解析理解',
    desc: '自动下载源视频，转写口播文本，分析结构与情绪节奏',
    tag: 'PARSE · TRANSCRIBE · ANALYZE',
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        <path d="M16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: '智能生成',
    desc: '改写脚本、合成配音、生成数字人形象与最终成片',
    tag: 'REWRITE · TTS · AVATAR · COMPOSE',
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    title: '一键发布',
    desc: '审核确认封面与字幕，选择平台分发成片并沉淀素材',
    tag: 'REVIEW · PUBLISH',
  },
]

/** 工作流说明卡片（工作台首页底部）：三步链路总览 */
export function HowItWorks() {
  return (
    <>
      {ITEMS.map((item, i) => (
        <div
          key={item.title}
          className="panel panel-hover group animate-fade-up p-5"
          style={{ animationDelay: `${240 + i * 60}ms` }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary-300 transition-transform duration-normal group-hover:scale-105">
            {item.icon}
          </span>
          <h3 className="mt-3 text-sm font-semibold text-ink-1">{item.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{item.desc}</p>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-ink-3">{item.tag}</p>
        </div>
      ))}
    </>
  )
}
