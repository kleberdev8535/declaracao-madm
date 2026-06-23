import { useState } from 'react'
import { toast } from '@/hooks/useToast'
import { Save, Building2, Clock, Link2, Bell, Shield, Palette } from 'lucide-react'

interface Section {
  id: string
  icon: React.ReactNode
  label: string
}

const SECTIONS: Section[] = [
  { id: 'empresa', icon: <Building2 size={16} />, label: 'Empresa' },
  { id: 'documentos', icon: <Clock size={16} />, label: 'Documentos' },
  { id: 'links', icon: <Link2 size={16} />, label: 'Links e URL' },
  { id: 'notificacoes', icon: <Bell size={16} />, label: 'Notificações' },
  { id: 'seguranca', icon: <Shield size={16} />, label: 'Segurança' },
  { id: 'aparencia', icon: <Palette size={16} />, label: 'Aparência' },
]

function Field({ label, type = 'text', value, onChange, hint }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-4 ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const [active, setActive] = useState('empresa')
  const [saved, setSaved] = useState(false)

  const [empresa, setEmpresa] = useState({ nome: 'MADM Assessoria', cnpj: '', email: 'contato@madm.com.br', telefone: '', site: '' })
  const [docs, setDocs] = useState({ expiracaoPadrao: '7', gerarPdfAutomatico: true, protocoloPrefix: 'PROT' })
  const [links, setLinks] = useState({ baseUrl: 'http://localhost:4000', frontendUrl: 'http://localhost:5173' })
  const [notif, setNotif] = useState({ docAssinado: true, docExpirado: true, docCancelado: false, docAberto: false })
  const [seg, setSeg] = useState({ ipRegistro: true, hashDocumento: true, hashAssinatura: true })
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'))

  function handleSave() {
    setSaved(true)
    toast({ title: 'Configurações salvas!', variant: 'success' })
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleDark(v: boolean) {
    setDark(v)
    document.documentElement.classList.toggle('dark', v)
  }

  return (
    <div className="flex gap-6 max-w-4xl">
      {/* Sidebar de seções */}
      <nav className="w-48 flex-shrink-0">
        <ul className="space-y-1">
          {SECTIONS.map(s => (
            <li key={s.id}>
              <button
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active === s.id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {s.icon} {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Conteúdo */}
      <div className="flex-1 bg-card border border-border rounded-xl p-6 space-y-5">
        {active === 'empresa' && (
          <>
            <p className="font-semibold text-foreground">Dados da empresa</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome da empresa" value={empresa.nome} onChange={v => setEmpresa(e => ({ ...e, nome: v }))} />
              <Field label="CNPJ" value={empresa.cnpj} onChange={v => setEmpresa(e => ({ ...e, cnpj: v }))} />
              <Field label="E-mail de contato" type="email" value={empresa.email} onChange={v => setEmpresa(e => ({ ...e, email: v }))} />
              <Field label="Telefone" value={empresa.telefone} onChange={v => setEmpresa(e => ({ ...e, telefone: v }))} />
              <Field label="Site" value={empresa.site} onChange={v => setEmpresa(e => ({ ...e, site: v }))} hint="Usado no rodapé dos documentos" />
            </div>
          </>
        )}

        {active === 'documentos' && (
          <>
            <p className="font-semibold text-foreground">Configurações de documentos</p>
            <Field label="Expiração padrão (dias)" type="number" value={docs.expiracaoPadrao}
              onChange={v => setDocs(d => ({ ...d, expiracaoPadrao: v }))}
              hint="Número de dias até o link de assinatura expirar" />
            <Field label="Prefixo do protocolo" value={docs.protocoloPrefix}
              onChange={v => setDocs(d => ({ ...d, protocoloPrefix: v }))}
              hint="Ex: PROT-20240101-00001" />
            <Toggle label="Gerar PDF automaticamente após assinatura"
              checked={docs.gerarPdfAutomatico}
              onChange={v => setDocs(d => ({ ...d, gerarPdfAutomatico: v }))} />
          </>
        )}

        {active === 'links' && (
          <>
            <p className="font-semibold text-foreground">URLs do sistema</p>
            <Field label="URL do backend (API)" value={links.baseUrl}
              onChange={v => setLinks(l => ({ ...l, baseUrl: v }))}
              hint="Usado para gerar os links de assinatura enviados ao cliente" />
            <Field label="URL do frontend" value={links.frontendUrl}
              onChange={v => setLinks(l => ({ ...l, frontendUrl: v }))} />
          </>
        )}

        {active === 'notificacoes' && (
          <>
            <p className="font-semibold text-foreground">Notificações em tempo real</p>
            <Toggle label="Documento assinado" description="Notificar quando cliente assinar" checked={notif.docAssinado} onChange={v => setNotif(n => ({ ...n, docAssinado: v }))} />
            <Toggle label="Documento expirado" description="Notificar quando o link expirar" checked={notif.docExpirado} onChange={v => setNotif(n => ({ ...n, docExpirado: v }))} />
            <Toggle label="Documento cancelado" checked={notif.docCancelado} onChange={v => setNotif(n => ({ ...n, docCancelado: v }))} />
            <Toggle label="Link aberto pelo cliente" checked={notif.docAberto} onChange={v => setNotif(n => ({ ...n, docAberto: v }))} />
          </>
        )}

        {active === 'seguranca' && (
          <>
            <p className="font-semibold text-foreground">Auditoria e segurança jurídica</p>
            <Toggle label="Registrar IP do signatário" description="Obrigatório para validade jurídica" checked={seg.ipRegistro} onChange={v => setSeg(s => ({ ...s, ipRegistro: v }))} />
            <Toggle label="Hash SHA-256 do documento" description="Garante integridade do conteúdo" checked={seg.hashDocumento} onChange={v => setSeg(s => ({ ...s, hashDocumento: v }))} />
            <Toggle label="Hash SHA-256 da assinatura" description="Garante autenticidade da assinatura" checked={seg.hashAssinatura} onChange={v => setSeg(s => ({ ...s, hashAssinatura: v }))} />
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Atenção:</strong> As opções de segurança acima são recomendadas e necessárias para validade jurídica conforme a Lei 14.063/2020 e MP 2.200-2/2001. Não desative sem orientação jurídica.
              </p>
            </div>
          </>
        )}

        {active === 'aparencia' && (
          <>
            <p className="font-semibold text-foreground">Aparência</p>
            <Toggle label="Modo escuro" description="Ativar tema dark em toda a interface" checked={dark} onChange={toggleDark} />
          </>
        )}

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Save size={14} /> {saved ? 'Salvo!' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
