import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './SideNav'

/** 底部导航（DESIGN.md §4.1）：仅手机端显示（<md），56px 高，触控目标 ≥44px */
export function BottomNav() {
  // 手机端只显示前 4 项，保证触控宽度
  const items = NAV_ITEMS.filter((i) => !i.disabled).slice(0, 4)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-gray-200 bg-white md:hidden"
      aria-label="底部导航"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-fast ${
              isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
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
            <path d={item.icon === 'plus' ? 'M12 5v14M5 12h14' : 'M3.75 12h16.5M3.75 6.75h16.5M3.75 17.25h16.5'} />
          </svg>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
