import { Bell, Moon, Sun, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getSocket } from '@/hooks/useSocket'
import { useSocketEvent } from '@/hooks/useSocket'
import { useToastState } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/ToastContainer'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<{ titulo: string; mensagem: string }[]>([])
  const { toasts, dismiss } = useToastState()

  useEffect(() => {
    const socket = getSocket()
    setConnected(socket.connected)
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    return () => { socket.off('connect'); socket.off('disconnect') }
  }, [])

  useSocketEvent('notification', (data: { titulo: string; mensagem: string }) => {
    setNotifications(n => [data, ...n].slice(0, 20))
  })

  const toggleDark = () => {
    const isDark = !dark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }

  return (
    <>
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Conexão WebSocket */}
          <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
            connected ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          )}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline">{connected ? 'Ao vivo' : 'Offline'}</span>
          </div>

          {/* Notificações */}
          <div className="relative group">
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell size={18} className="text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
            {notifications.length > 0 && (
              <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-lg z-50 hidden group-hover:block animate-fade-in">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-semibold">Notificações</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div key={i} className="px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-accent/50">
                      <p className="text-sm font-medium">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2">
                  <button onClick={() => setNotifications([])} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">
                    Limpar notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dark mode */}
          <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-accent transition-colors">
            {dark ? <Sun size={18} className="text-muted-foreground" /> : <Moon size={18} className="text-muted-foreground" />}
          </button>
        </div>
      </header>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
