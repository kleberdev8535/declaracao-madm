import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { Shield, ChevronLeft, ChevronRight, Monitor, Globe, Clock } from 'lucide-react'

interface AuditEvent {
  id: string
  status: string
  ip?: string
  userAgent?: string
  dispositivo?: string
  navegador?: string
  sistemaOp?: string
  timezone?: string
  descricao?: string
  createdAt: string
  document: {
    titulo: string
    protocolo?: string
    cliente: { nome: string }
  }
}

export default function AuditLogs() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => auditApi.list({ page, limit: 25 }),
    refetchInterval: 30000,
  })

  const events: AuditEvent[] = data?.events || []
  const pages: number = data?.pages || 1
  const total: number = data?.total || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
          <Shield size={13} />
          Registros imutáveis — {total} eventos
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente / Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                : events.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-muted-foreground">
                        <Shield size={36} className="mx-auto mb-3 opacity-25" />
                        <p className="font-medium">Nenhum evento registrado</p>
                      </td>
                    </tr>
                  )
                  : events.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock size={11} />
                          {formatDateTime(e.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">{e.document?.cliente?.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{e.document?.protocolo || e.document?.titulo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe size={11} />
                          {e.ip || '—'}
                        </div>
                        {e.sistemaOp && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mt-0.5">
                            <Monitor size={10} />
                            {e.sistemaOp}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {e.descricao || '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{total} eventos no total</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-muted-foreground">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
