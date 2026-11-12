import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: number
  kind: ToastKind
  title: string
  message: string
}

interface ToastContextValue {
  notify: (kind: ToastKind, title: string, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const styles: Record<ToastKind, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'border-emerald-700 bg-emerald-950 text-emerald-100' },
  error: { icon: AlertCircle, classes: 'border-red-700 bg-red-950 text-red-100' },
  warning: { icon: AlertCircle, classes: 'border-amber-700 bg-amber-950 text-amber-100' },
  info: { icon: Info, classes: 'border-sky-700 bg-sky-950 text-sky-100' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const notify = useCallback((kind: ToastKind, title: string, message: string) => {
    const id = ++nextId.current
    setToasts(current => [...current, { id, kind, title, message }])
    timers.current.set(id, window.setTimeout(() => dismiss(id), 6000))
  }, [dismiss])

  useEffect(() => () => {
    timers.current.forEach(timer => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map(toast => {
          const { icon: Icon, classes } = styles[toast.kind]
          return (
            <div
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur ${classes}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{toast.title}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-90">{toast.message}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
