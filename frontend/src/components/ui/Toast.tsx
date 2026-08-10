import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const typeStyle: Record<ToastType, string> = {
  success: 'border-success text-success',
  error: 'border-danger text-danger',
  warning: 'border-warning text-warning',
  info: 'border-info text-info',
}

/** Toast 系统（DESIGN.md §3.2.1）：桌面右上角，手机底部浮层 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++
      setItems((prev) => [...prev, { id, type, message }])
      if (type !== 'error') {
        setTimeout(() => remove(id), type === 'info' ? 1500 : 3000)
      }
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 sm:bottom-4 sm:top-auto sm:right-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex w-80 max-w-[calc(100vw-2rem)] items-center justify-between gap-3 rounded-md border bg-panel px-4 py-3 shadow-lg ${typeStyle[t.type]}`}
            role="alert"
          >
            <span className="text-sm text-ink-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="关闭"
              className="text-ink-3 hover:text-ink-2"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用')
  return ctx
}
