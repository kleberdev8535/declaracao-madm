import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { formatCpf, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { Search, Users, FileText, X, Phone, Mail, MapPin } from 'lucide-react'

interface Client {
  id: string
  nome: string
  cpf: string
  rg?: string
  estadoCivil?: string
  nacionalidade?: string
  profissao?: string
  telefone?: string
  email?: string
  rua?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  createdAt: string
  _count?: { documents: number }
}

interface ClientDetail extends Client {
  documents: { id: string; titulo: string; status: string; createdAt: string }[]
}

export default function Clients() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search: search || undefined }),
  })

  const { data: detail } = useQuery<ClientDetail>({
    queryKey: ['client', selected],
    queryFn: () => clientsApi.getById(selected!),
    enabled: !!selected,
  })

  return (
    <div className="space-y-5">
      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-5">
        {/* Tabela */}
        <div className={`bg-card border border-border rounded-xl overflow-hidden ${selected ? 'flex-1' : 'w-full'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">CPF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Documentos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : (clients as Client[]).length === 0
                    ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16 text-muted-foreground">
                          <Users size={36} className="mx-auto mb-3 opacity-25" />
                          <p className="font-medium">Nenhum cliente encontrado</p>
                        </td>
                      </tr>
                    )
                    : (clients as Client[]).map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.id === selected ? null : c.id)}
                        className={`cursor-pointer hover:bg-muted/20 transition-colors ${c.id === selected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatCpf(c.cpf)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{c.cidade && c.uf ? `${c.cidade}/${c.uf}` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileText size={12} />
                            {c._count?.documents || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel lateral do cliente */}
        {selected && detail && (
          <div className="w-80 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm text-foreground">Perfil do cliente</p>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-accent transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info */}
              <div>
                <p className="font-bold text-foreground">{detail.nome}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatCpf(detail.cpf)}</p>
              </div>

              <div className="space-y-2">
                {detail.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone size={13} /> {detail.telefone}
                  </div>
                )}
                {detail.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={13} /> {detail.email}
                  </div>
                )}
                {detail.cidade && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={13} /> {detail.cidade}/{detail.uf}
                  </div>
                )}
              </div>

              {[
                { label: 'RG', value: detail.rg },
                { label: 'Estado civil', value: detail.estadoCivil },
                { label: 'Profissão', value: detail.profissao },
                { label: 'Nacionalidade', value: detail.nacionalidade },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}

              {/* Documentos recentes */}
              {detail.documents?.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Documentos recentes</p>
                  <div className="space-y-2">
                    {detail.documents.slice(0, 5).map(d => (
                      <div key={d.id} className="flex items-center justify-between">
                        <p className="text-xs text-foreground truncate flex-1">{d.titulo}</p>
                        <StatusBadge status={d.status} className="ml-2 text-[10px]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
