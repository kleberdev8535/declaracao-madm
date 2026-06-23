import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi, templatesApi, clientsApi } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime, formatCpf, STATUS_LABELS } from '@/lib/utils'
import {
  Search, Filter, Plus, Send, Ban, RefreshCw,
  Download, ChevronLeft, ChevronRight, Eye, Clock,
  Copy, X, CheckCircle2,
} from 'lucide-react'
import { useSocketEvent } from '@/hooks/useSocket'

const ALL_STATUSES = Object.entries(STATUS_LABELS)

interface Document {
  id: string
  titulo: string
  status: string
  protocolo: string
  linkAssinatura: string
  responsavel?: string
  advogado?: string
  createdAt: string
  updatedAt: string
  cliente: { nome: string; cpf: string; telefone?: string }
  template?: { nome: string; categoria: string }
}

interface Template { id: string; nome: string; categoria: string }
interface Client { id: string; nome: string; cpf: string }

export default function Signatures() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<'create' | 'detail' | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Form para novo documento
  const [form, setForm] = useState({
    templateId: '', clienteId: '', responsavel: '', advogado: '', unidade: '',
    expiresInDays: 7,
    ocrData: {
      nome: '', cpf: '', rg: '', estadoCivil: '', nacionalidade: '', profissao: '',
      rua: '', numero: '', complemento: '', bairro: '', cep: '', cidade: '', uf: '',
      telefone: '', email: '',
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search, status, page }],
    queryFn: () => documentsApi.list({ search: search || undefined, status: status || undefined, page, limit: 15 }),
    refetchInterval: 15000,
  })

  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: templatesApi.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list })

  const createMut = useMutation({
    mutationFn: (data: unknown) => documentsApi.create(data),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: 'Documento criado!', description: `Link: ${doc.linkAssinatura}`, variant: 'success' })
      setModal(null)
      resetForm()
    },
    onError: () => toast({ title: 'Erro ao criar documento', variant: 'destructive' }),
  })

  const cancelMut = useMutation({
    mutationFn: documentsApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast({ title: 'Documento cancelado' }) },
  })

  const resendMut = useMutation({
    mutationFn: documentsApi.resend,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast({ title: 'Documento reenviado!', variant: 'success' }) },
  })

  // Atualização em tempo real
  useSocketEvent('document:updated', () => qc.invalidateQueries({ queryKey: ['documents'] }))
  useSocketEvent('document:signed', () => qc.invalidateQueries({ queryKey: ['documents'] }))

  function resetForm() {
    setForm({
      templateId: '', clienteId: '', responsavel: '', advogado: '', unidade: '',
      expiresInDays: 7,
      ocrData: { nome: '', cpf: '', rg: '', estadoCivil: '', nacionalidade: '', profissao: '', rua: '', numero: '', complemento: '', bairro: '', cep: '', cidade: '', uf: '', telefone: '', email: '' },
    })
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    toast({ title: 'Link copiado!', variant: 'success' })
    setTimeout(() => setCopiedLink(null), 2000)
  }

  function handleCreate() {
    if (!form.templateId) { toast({ title: 'Selecione um modelo', variant: 'warning' }); return }
    if (!form.ocrData.cpf && !form.clienteId) { toast({ title: 'Informe o CPF ou selecione um cliente', variant: 'warning' }); return }

    const selectedTemplate = (templates as Template[]).find((t: Template) => t.id === form.templateId)
    createMut.mutate({
      titulo: selectedTemplate?.nome || 'Documento',
      templateId: form.templateId,
      clienteId: form.clienteId || undefined,
      ocrData: form.clienteId ? undefined : form.ocrData,
      responsavel: form.responsavel,
      advogado: form.advogado,
      unidade: form.unidade,
      expiresInDays: form.expiresInDays,
    })
  }

  const documents: Document[] = data?.documents || []
  const total: number = data?.total || 0
  const pages: number = data?.pages || 1

  const canCreate = !['ASSINADO', 'FINALIZADO', 'CANCELADO'].includes(selectedDoc?.status || '')

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome, CPF, protocolo..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos os status</option>
              {ALL_STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus size={16} /> Novo Documento
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Envio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsável</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : documents.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <Send size={36} className="mx-auto mb-3 opacity-25" />
                        <p className="font-medium">Nenhum documento encontrado</p>
                        <p className="text-xs mt-1">Crie o primeiro documento para envio</p>
                      </td>
                    </tr>
                  )
                  : documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{doc.cliente.nome}</p>
                        {doc.protocolo && <p className="text-xs text-muted-foreground font-mono">{doc.protocolo}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatCpf(doc.cliente.cpf)}</td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{doc.titulo}</p>
                        {doc.template && <p className="text-xs text-muted-foreground">{doc.template.nome}</p>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(doc.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{doc.responsavel || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedDoc(doc); setModal('detail') }}
                            title="Ver detalhes"
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          {doc.linkAssinatura && (
                            <button
                              onClick={() => copyLink(doc.linkAssinatura)}
                              title="Copiar link"
                              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedLink === doc.linkAssinatura ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          )}
                          {['CRIADO', 'ENVIADO', 'EXPIRADO'].includes(doc.status) && (
                            <button
                              onClick={() => resendMut.mutate(doc.id)}
                              title="Reenviar"
                              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          {doc.status === 'ASSINADO' && (
                            <button
                              onClick={() => window.open(`/api/documents/${doc.id}/pdf`, '_blank')}
                              title="Baixar PDF"
                              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-green-500 transition-colors"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          {!['ASSINADO', 'FINALIZADO', 'CANCELADO', 'EXPIRADO'].includes(doc.status) && (
                            <button
                              onClick={() => cancelMut.mutate(doc.id)}
                              title="Cancelar"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{total} documentos</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-muted-foreground">{page} / {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Documento */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Novo Documento para Assinatura</h2>
              <button onClick={() => { setModal(null); resetForm() }} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Modelo */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Modelo de documento *</label>
                <select
                  value={form.templateId}
                  onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um modelo...</option>
                  {(templates as Template[]).map((t: Template) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              {/* Cliente existente OU dados OCR */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Cliente cadastrado</label>
                  <select
                    value={form.clienteId}
                    onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Ou informe dados abaixo...</option>
                    {(clients as Client[]).map((c: Client) => (
                      <option key={c.id} value={c.id}>{c.nome} — {formatCpf(c.cpf)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Expiração (dias)</label>
                  <input
                    type="number" min={1} max={30}
                    value={form.expiresInDays}
                    onChange={e => setForm(f => ({ ...f, expiresInDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Dados OCR (se não selecionou cliente) */}
              {!form.clienteId && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-sm font-medium text-foreground">Dados do cliente (via OCR ou manual)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'nome', label: 'Nome completo *', full: true },
                      { key: 'cpf', label: 'CPF *' },
                      { key: 'rg', label: 'RG' },
                      { key: 'estadoCivil', label: 'Estado civil' },
                      { key: 'nacionalidade', label: 'Nacionalidade' },
                      { key: 'profissao', label: 'Profissão' },
                      { key: 'telefone', label: 'Telefone' },
                      { key: 'email', label: 'E-mail' },
                      { key: 'rua', label: 'Logradouro', full: true },
                      { key: 'numero', label: 'Número' },
                      { key: 'complemento', label: 'Complemento' },
                      { key: 'bairro', label: 'Bairro' },
                      { key: 'cep', label: 'CEP' },
                      { key: 'cidade', label: 'Cidade' },
                      { key: 'uf', label: 'UF' },
                    ].map(({ key, label, full }) => (
                      <div key={key} className={full ? 'col-span-2' : ''}>
                        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                        <input
                          value={(form.ocrData as Record<string, string>)[key] || ''}
                          onChange={e => setForm(f => ({ ...f, ocrData: { ...f.ocrData, [key]: e.target.value } }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsável */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'responsavel', label: 'Consultor' },
                  { key: 'advogado', label: 'Advogado' },
                  { key: 'unidade', label: 'Unidade' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <input
                      value={(form as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => { setModal(null); resetForm() }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
                {createMut.isPending ? 'Criando...' : 'Criar e gerar link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe */}
      {modal === 'detail' && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{selectedDoc.titulo}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selectedDoc.protocolo}</p>
              </div>
              <button onClick={() => { setModal(null); setSelectedDoc(null) }} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <span className="text-sm font-medium">{selectedDoc.cliente.nome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CPF</span>
                <span className="text-sm font-mono">{formatCpf(selectedDoc.cliente.cpf)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Criado em</span>
                <span className="text-sm">{formatDateTime(selectedDoc.createdAt)}</span>
              </div>
              {selectedDoc.responsavel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consultor</span>
                  <span className="text-sm">{selectedDoc.responsavel}</span>
                </div>
              )}
              {selectedDoc.linkAssinatura && !['ASSINADO', 'FINALIZADO', 'CANCELADO'].includes(selectedDoc.status) && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Link de assinatura</p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate">
                      {selectedDoc.linkAssinatura}
                    </code>
                    <button
                      onClick={() => copyLink(selectedDoc.linkAssinatura)}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 transition-colors"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
