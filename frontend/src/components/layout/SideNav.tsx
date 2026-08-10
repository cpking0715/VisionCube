import { NavLink } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  icon: string
  disabled?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '任务列表', icon: 'list' },
  { to: '/assets', label: '资产库', icon: 'folder' },
  { to: '/publish', label: '发布物料', icon: 'send' },
  { to: '/voices', label: '音色管理', icon: 'mic' },
  { to: '/settings', label: '设置', icon: 'gear' },
]

export const ICON_PATHS: Record<string, string> = {
  list: 'M3.75 12h16.5M3.75 6.75h16.5M3.75 17.25h16.5',
  plus: 'M12 5v14M5 12h14',
  folder:
    'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  gear: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z',
  mic: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
}

/** 侧边导航（DESIGN.md §4.1）：桌面 240px 可折叠至 64px；平板 64px icon-only */
export function SideNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const inner = (
          <>
            <svg
              className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICON_PATHS[item.icon]} />
            </svg>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.disabled && (
              <span className="ml-auto rounded-sm bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-3">
                敬请期待
              </span>
            )}
          </>
        )
        if (item.disabled) {
          return (
            <span
              key={item.to}
              title={item.label}
              className="flex cursor-not-allowed items-center rounded-md px-3 py-2.5 text-sm font-medium text-ink-3"
            >
              {inner}
            </span>
          )
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast ${
                isActive
                  ? 'bg-primary-500/15 text-primary-300'
                  : 'text-ink-2 hover:bg-panel-2 hover:text-ink-1'
              }`
            }
          >
            {inner}
          </NavLink>
        )
      })}
    </nav>
  )
}
