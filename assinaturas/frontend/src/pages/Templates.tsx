import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import {
  Plus, Pencil, Trash2, Copy, FileText, FileStack,
  FileSignature, File, ChevronDown, ChevronUp, X, Save,
  Eye, EyeOff,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  DECLARACAO: 'Declaração',
  PROCURACAO: 'Procuração',
  CONTRATO: 'Contrato',
  TERMO: 'Termo',
  AUTORIZACAO: 'Autorização',
  FICHA_CADASTRAL: 'Ficha Cadastral',
  OUTRO: 'Outro',
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  DECLARACAO: <FileText size={16} />,
  PROCURACAO: <FileSignature size={16} />,
  CONTRATO: <FileStack size={16} />,
  OUTRO: <File size={16} />,
}

const VARIABLES = [
  '{{nome}}', '{{cpf}}', '{{rg}}', '{{estado_civil}}', '{{nacionalidade}}',
  '{{profissao}}', '{{data_nascimento}}', '{{endereco}}', '{{cidade}}',
  '{{uf}}', '{{cep}}', '{{telefone}}', '{{email}}', '{{data_atual}}',
]

interface Template {
  id: string
  nome: string
  descricao?: string
  categoria: string
  conteudo: string
  variaveis: string[]
  ativo: boolean
  createdAt: string
}

interface TemplateForm {
  nome: string
  descricao: string
  categoria: string
  conteudo: string
}

const EMPTY_FORM: TemplateForm = { nome: '', descricao: '', categoria: 'DECLARACAO', conteudo: '' }

export default function Templates() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | 'preview' | null>(null)
  const [selected, setSelected] = useState<Template | null>(null)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  })

  const createMut = useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); closeModal(); toast({ title: 'Modelo criado!', variant: 'success' }) },
    onError: () => toast({ title: 'Erro ao criar modelo', variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => templatesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); closeModal(); toast({ title: 'Modelo atualizado!', variant: 'success' }) },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  })

  const deleteMut = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Modelo arquivado', variant: 'default' }) },
  })

  function openCreate() { setForm(EMPTY_FORM); setSelected(null); setModal('create') }
  function openEdit(t: Template) { setForm({ nome: t.nome, descricao: t.descricao || '', categoria: t.categoria, conteudo: t.conteudo }); setSelected(t); setModal('edit') }
  function openPreview(t: Template) { setSelected(t); setModal('preview') }
  function closeModal() { setModal(null); setSelected(null) }

  function insertVariable(v: string) {
    setForm(f => ({ ...f, conteudo: f.conteudo + v }))
  }

  function handleSubmit() {
    if (!form.nome.trim() || !form.conteudo.trim()) {
      toast({ title: 'Nome e conteúdo são obrigatórios', variant: 'warning' })
      return
    }
    if (modal === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  function duplicateTemplate(t: Template) {
    createMut.mutate({ nome: `${t.nome} (cópia)`, descricao: t.descricao, categoria: t.categoria, conteudo: t.conteudo })
  }

  const isSubmitting = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{templates.length} modelos disponíveis</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo Modelo
        </button>
      </div>

      {/* Grid de cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <FileStack size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum modelo cadastrado</p>
          <p className="text-sm">Crie seu primeiro modelo de documento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t: Template) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    {CATEGORY_ICONS[t.categoria] || <File size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[t.categoria]}</p>
                  </div>
                </div>
              </div>

              {t.descricao && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.descricao}</p>
              )}

              {/* Variáveis */}
              {t.variaveis.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {t.variaveis.slice(0, 5).map(v => (
                    <span key={v} className="px-1.5 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {t.variaveis.length > 5 && (
                    <span className="px-1.5 py-0.5 bg-accent text-muted-foreground rounded text-[10px]">+{t.variaveis.length - 5}</span>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                <button onClick={() => openPreview(t)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Eye size={13} /> Visualizar
                </button>
                <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={() => duplicateTemplate(t)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Copy size={13} /> Duplicar
                </button>
                <button onClick={() => deleteMut.mutate(t.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{modal === 'create' ? 'Novo Modelo' : 'Editar Modelo'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Nome e categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do modelo *</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Declaração de Hipossuficiência"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
                <input
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descrição breve do modelo..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Variáveis disponíveis */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Variáveis disponíveis — clique para inserir</label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map(v => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono hover:bg-primary hover:text-white transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conteúdo */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Conteúdo do documento *</label>
                <textarea
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  rows={14}
                  placeholder="Escreva o conteúdo do documento. Use as variáveis acima para inserir dados dinâmicos..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.conteudo.length} caracteres</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {isSubmitting ? 'Salvando...' : 'Salvar modelo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview */}
      {modal === 'preview' && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{selected.nome}</h2>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[selected.categoria]}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{selected.conteudo}</pre>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => { closeModal(); openEdit(selected) }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
                <Pencil size={14} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
