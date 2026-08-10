import { NavLink } from 'react-router-dom'
import { ICON_PATHS, NAV_ITEMS } from './SideNav'

// 手机端保留 3 个高频入口，保证触控宽度（≥44px）；新建任务由任务列表页 FAB 提供
const MOBILE_TOS = ['/', '/assets', '/settings']

/** 底部导航（DESIGN.md §4.1）：仅手机端显示（<md），56px 高，触控目标 ≥44px */
export function BottomNav() {
  const items = NAV_ITEMS.filter((i) => MOBILE_TOS.includes(i.to))
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-line bg-panel/85 backdrop-blur-md md:hidden"
      aria-label="底部导航"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-fast ${
              isActive ? 'text-primary-400' : 'text-ink-2 hover:text-ink-1'
            }`
          }
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={ICON_PATHS[item.icon]} />
          </svg>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
