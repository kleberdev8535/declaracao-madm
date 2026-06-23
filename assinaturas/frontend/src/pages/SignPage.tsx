import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '@/lib/api'
import { formatCpf } from '@/lib/utils'
import {
  CheckCircle2, ChevronRight, AlertCircle, Loader2,
  RotateCcw, ShieldCheck, FileText, PenLine, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

interface ClientData {
  id: string
  titulo: string
  conteudo: string
  protocolo: string
  status: string
  expiresAt: string
  cliente: {
    nome: string; cpf: string; rg?: string; estadoCivil?: string
    nacionalidade?: string; profissao?: string; telefone?: string
    email?: string; rua?: string; numero?: string; complemento?: string
    bairro?: string; cep?: string; cidade?: string; uf?: string
  }
}

interface SignResult {
  protocolo: string
  hashAssinatura: string
  signedAt: string
}

const STEP_LABELS = ['Confirmar dados', 'Ler documento', 'Assinar', 'Concluído']

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<ClientData | null>(null)
  const [dataConfirmed, setDataConfirmed] = useState(false)
  const [signResult, setSignResult] = useState<SignResult | null>(null)
  const [signing, setSigning] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // Busca documento
  useEffect(() => {
    if (!token) return
    publicApi.getDocument(token)
      .then(setDoc)
      .catch(err => setError(err?.response?.data?.error || 'Link inválido ou expirado'))
      .finally(() => setLoading(false))
  }, [token])

  // Canvas de assinatura
  useEffect(() => {
    if (step !== 3) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [step])

  function getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    isDrawingRef.current = true
    lastPosRef.current = pos
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    setHasSignature(true)
  }

  function stopDraw() { isDrawingRef.current = false }

  function clearCanvas() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setHasSignature(false)
  }

  async function goToStep2() {
    if (!dataConfirmed) return
    await publicApi.confirmData(token!)
    setStep(2)
  }

  async function goToStep3() {
    await publicApi.markViewed(token!)
    await publicApi.startSign(token!)
    setStep(3)
  }

  async function submitSignature() {
    if (!hasSignature) return
    setSigning(true)
    try {
      const canvas = canvasRef.current!
      const imagemBase64 = canvas.toDataURL('image/png')
      const result = await publicApi.sign(token!, {
        imagemBase64,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setSignResult(result)
      setStep(4)
    } catch {
      alert('Erro ao processar assinatura. Tente novamente.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando documento...</p>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground text-sm">{error || 'Este link não existe ou foi expirado.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{doc.titulo}</p>
              <p className="text-[10px] text-muted-foreground">Assinatura Digital Segura</p>
            </div>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as Step
              const done = step > n
              const active = step === n
              return (
                <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                    done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {done ? <CheckCircle2 size={12} /> : n}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium truncate hidden sm:block',
                    active ? 'text-foreground' : 'text-muted-foreground'
                  )}>{label}</span>
                  {n < 4 && <div className="flex-1 h-px bg-border mx-1 hidden sm:block" />}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">

        {/* PASSO 1 — Confirmar dados */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Confirme seus dados</h2>
              <p className="text-muted-foreground text-sm mt-1">Verifique se as informações abaixo estão corretas</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {[
                { label: 'Nome completo', value: doc.cliente.nome },
                { label: 'CPF', value: formatCpf(doc.cliente.cpf) },
                { label: 'RG', value: doc.cliente.rg },
                { label: 'Estado civil', value: doc.cliente.estadoCivil },
                { label: 'Nacionalidade', value: doc.cliente.nacionalidade },
                { label: 'Profissão', value: doc.cliente.profissao },
                { label: 'Telefone', value: doc.cliente.telefone },
                { label: 'E-mail', value: doc.cliente.email },
                { label: 'Endereço', value: [doc.cliente.rua, doc.cliente.numero, doc.cliente.complemento].filter(Boolean).join(', ') || undefined },
                { label: 'Bairro', value: doc.cliente.bairro },
                { label: 'Cidade / UF', value: doc.cliente.cidade && doc.cliente.uf ? `${doc.cliente.cidade} / ${doc.cliente.uf}` : undefined },
                { label: 'CEP', value: doc.cliente.cep },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start px-4 py-3 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground flex-shrink-0 w-36">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dataConfirmed}
                onChange={e => setDataConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <span className="text-sm text-foreground leading-relaxed">
                Confirmo que os dados acima estão corretos e correspondem à minha identidade
              </span>
            </label>

            {!dataConfirmed && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                Marque a caixa acima para continuar
              </p>
            )}
          </div>
        )}

        {/* PASSO 2 — Visualizar documento */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Leia o documento</h2>
              <p className="text-muted-foreground text-sm mt-1">Leia com atenção antes de assinar</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-3 text-sm">{doc.titulo}</h3>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {doc.conteudo}
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3 — Assinar */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <PenLine size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Assine abaixo</h2>
              <p className="text-muted-foreground text-sm mt-1">Use o dedo ou mouse para assinar</p>
            </div>

            <div className="bg-card border-2 border-dashed border-border rounded-2xl overflow-hidden">
              <canvas
                ref={canvasRef}
                className="signature-canvas w-full"
                style={{ height: '220px', display: 'block' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {hasSignature ? '✓ Assinatura detectada' : 'Assine na área acima'}
              </p>
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={12} /> Limpar
              </button>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Ao assinar, você declara:</p>
              <p>• Que leu e concordou com o documento acima</p>
              <p>• Que os dados apresentados são verídicos</p>
              <p>• Que esta assinatura tem validade jurídica conforme a Lei 14.063/2020</p>
            </div>
          </div>
        )}

        {/* PASSO 4 — Concluído */}
        {step === 4 && signResult && (
          <div className="space-y-5 animate-fade-in text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Documento assinado!</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Sua assinatura foi registrada com sucesso e tem validade jurídica.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
              <p className="text-sm font-semibold text-foreground">Comprovante de assinatura</p>
              {[
                { label: 'Protocolo', value: signResult.protocolo, mono: true },
                { label: 'Assinado em', value: new Date(signResult.signedAt).toLocaleString('pt-BR') },
                { label: 'Hash', value: signResult.hashAssinatura?.slice(0, 32) + '...', mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
                  <span className={cn('text-xs text-foreground text-right break-all', mono && 'font-mono')}>{value}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Guarde o número do protocolo para validar sua assinatura a qualquer momento.
            </p>
          </div>
        )}
      </main>

      {/* Botão fixo no rodapé */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-20">
          <div className="max-w-lg mx-auto">
            {step === 1 && (
              <button
                onClick={goToStep2}
                disabled={!dataConfirmed}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                Continuar para o documento <ChevronRight size={16} />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={goToStep3}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Li o documento, ir para assinatura <ChevronRight size={16} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={submitSignature}
                disabled={!hasSignature || signing}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-green-700 transition-colors"
              >
                {signing ? (
                  <><Loader2 size={16} className="animate-spin" /> Processando...</>
                ) : (
                  <><CheckCircle2 size={16} /> Assinar documento</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
