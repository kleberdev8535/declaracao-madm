import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast } from '@/hooks/useToast'

interface ToastContainerProps {
  toasts: Toast[]
  dismiss: (id: string) => void
}

const icons = {
  default: <Info size={16} className="text-blue-500" />,
  success: <CheckCircle2 size={16} className="text-green-500" />,
  destructive: <AlertCircle size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-yellow-500" />,
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-card animate-fade-in',
            t.variant === 'destructive' && 'border-red-200 dark:border-red-800',
            t.variant === 'success' && 'border-green-200 dark:border-green-800',
          )}
        >
          <span className="mt-0.5 flex-shrink-0">{icons[t.variant || 'default']}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="flex-shrink-0 p-0.5 rounded hover:bg-accent transition-colors">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  )
}
