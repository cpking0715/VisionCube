import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** 模态框（DESIGN.md §3.2.2）：桌面居中 Dialog，手机端底部全屏 Drawer */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full flex-col rounded-t-xl bg-panel shadow-xl sm:max-w-[560px] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-ink-1">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink-2"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

interface DialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 确认对话框（DESIGN.md §3.2.4）：破坏性操作二次确认；手机端 ActionSheet 由 Modal 底部形态承载 */
export function Dialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-line-strong px-4 text-sm font-medium text-ink-1 hover:bg-panel-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 rounded-md px-4 text-sm font-medium text-white ${danger ? 'bg-danger hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'}`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-2">{description}</p>}
    </Modal>
  )
}
