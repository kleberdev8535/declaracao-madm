import { prisma } from '../lib/prisma'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { CreateDocumentDto, OcrData } from '../types'

export const DS = {
  CRIADO: 'CRIADO',
  ENVIADO: 'ENVIADO',
  ENTREGUE: 'ENTREGUE',
  LINK_ABERTO: 'LINK_ABERTO',
  DADOS_CONFERIDOS: 'DADOS_CONFERIDOS',
  DOCUMENTO_VISUALIZADO: 'DOCUMENTO_VISUALIZADO',
  ASSINATURA_INICIADA: 'ASSINATURA_INICIADA',
  ASSINADO: 'ASSINADO',
  FINALIZADO: 'FINALIZADO',
  EXPIRADO: 'EXPIRADO',
  CANCELADO: 'CANCELADO',
} as const

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildProtocol(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `PROT-${y}${m}${d}-${rand}`
}

function fillTemplate(conteudo: string, data: OcrData & { data_atual?: string }): string {
  const vars: Record<string, string> = {
    nome: data.nome || '',
    cpf: data.cpf || '',
    rg: data.rg || '',
    estado_civil: data.estadoCivil || '',
    nacionalidade: data.nacionalidade || '',
    profissao: data.profissao || '',
    data_nascimento: data.dataNascimento || '',
    endereco: [data.rua, data.numero, data.complemento].filter(Boolean).join(', '),
    rua: data.rua || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cep: data.cep || '',
    cidade: data.cidade || '',
    uf: data.uf || '',
    telefone: data.telefone || '',
    email: data.email || '',
    data_atual: data.data_atual || formatDate(new Date()),
  }
  return conteudo.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export async function createDocument(dto: CreateDocumentDto) {
  let conteudo = dto.titulo
  let clienteId = dto.clienteId

  if (dto.templateId) {
    const template = await prisma.template.findUnique({ where: { id: dto.templateId } })
    if (template && dto.ocrData) {
      conteudo = fillTemplate(template.conteudo, dto.ocrData)
    }
  }

  if (!clienteId && dto.ocrData?.cpf) {
    const cpfClean = dto.ocrData.cpf.replace(/\D/g, '')
    const cliente = await prisma.client.upsert({
      where: { cpf: cpfClean },
      update: {
        nome: dto.ocrData.nome || undefined,
        rg: dto.ocrData.rg || undefined,
        estadoCivil: dto.ocrData.estadoCivil || undefined,
        nacionalidade: dto.ocrData.nacionalidade || undefined,
        profissao: dto.ocrData.profissao || undefined,
        telefone: dto.ocrData.telefone || undefined,
        email: dto.ocrData.email || undefined,
        rua: dto.ocrData.rua || undefined,
        numero: dto.ocrData.numero || undefined,
        complemento: dto.ocrData.complemento || undefined,
        bairro: dto.ocrData.bairro || undefined,
        cep: dto.ocrData.cep || undefined,
        cidade: dto.ocrData.cidade || undefined,
        uf: dto.ocrData.uf || undefined,
      },
      create: {
        nome: dto.ocrData.nome || 'Sem nome',
        cpf: cpfClean,
        rg: dto.ocrData.rg,
        estadoCivil: dto.ocrData.estadoCivil,
        nacionalidade: dto.ocrData.nacionalidade,
        profissao: dto.ocrData.profissao,
        telefone: dto.ocrData.telefone,
        email: dto.ocrData.email,
        rua: dto.ocrData.rua,
        numero: dto.ocrData.numero,
        complemento: dto.ocrData.complemento,
        bairro: dto.ocrData.bairro,
        cep: dto.ocrData.cep,
        cidade: dto.ocrData.cidade,
        uf: dto.ocrData.uf,
      },
    })
    clienteId = cliente.id
  }

  if (!clienteId) throw new Error('Cliente não identificado. Forneça clienteId ou ocrData com CPF.')

  const token = uuidv4()
  const protocolo = buildProtocol()
  const hashDocumento = crypto.createHash('sha256').update(conteudo).digest('hex')
  const baseUrl = process.env.BASE_URL || 'http://localhost:4000'
  const linkAssinatura = `${baseUrl}/assinar/${token}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays || 7))

  const document = await prisma.document.create({
    data: {
      titulo: dto.titulo,
      conteudo,
      token,
      linkAssinatura,
      protocolo,
      hashDocumento,
      expiresAt,
      status: DS.CRIADO,
      responsavel: dto.responsavel,
      advogado: dto.advogado,
      unidade: dto.unidade,
      clienteId,
      templateId: dto.templateId,
    },
    include: { cliente: true, template: true },
  })

  await prisma.auditEvent.create({
    data: { documentId: document.id, status: DS.CRIADO, descricao: 'Documento criado no sistema' },
  })

  return document
}

export async function getDocuments(filters?: {
  status?: string
  clienteId?: string
  responsavel?: string
  advogado?: string
  search?: string
  page?: number
  limit?: number
}) {
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (filters?.status) where.status = filters.status
  if (filters?.clienteId) where.clienteId = filters.clienteId
  if (filters?.responsavel) where.responsavel = filters.responsavel
  if (filters?.advogado) where.advogado = filters.advogado
  if (filters?.search) {
    where.OR = [
      { titulo: { contains: filters.search } },
      { protocolo: { contains: filters.search } },
      { cliente: { nome: { contains: filters.search } } },
      { cliente: { cpf: { contains: filters.search } } },
    ]
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limit,
      include: { cliente: true, template: { select: { nome: true, categoria: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.count({ where }),
  ])

  return { documents, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getDocumentByToken(token: string) {
  return prisma.document.findUnique({
    where: { token },
    include: { cliente: true, template: true, eventos: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { cliente: true, template: true, assinatura: true, eventos: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function updateDocumentStatus(
  documentId: string,
  status: string,
  metadata?: { ip?: string; userAgent?: string; descricao?: string; metadata?: Record<string, unknown> }
) {
  const [document] = await Promise.all([
    prisma.document.update({
      where: { id: documentId },
      data: { status },
      include: { cliente: true },
    }),
    prisma.auditEvent.create({
      data: {
        documentId,
        status,
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
        descricao: metadata?.descricao,
        metadata: metadata?.metadata ? JSON.stringify(metadata.metadata) : undefined,
      },
    }),
  ])
  return document
}

export async function getDashboardMetrics() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [total, enviados, visualizados, assinados, expirados, cancelados, hoje_assinados, mes_assinados] =
    await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { status: { in: [DS.ENVIADO, DS.ENTREGUE, DS.LINK_ABERTO] } } }),
      prisma.document.count({ where: { status: { in: [DS.DOCUMENTO_VISUALIZADO, DS.DADOS_CONFERIDOS] } } }),
      prisma.document.count({ where: { status: { in: [DS.ASSINADO, DS.FINALIZADO] } } }),
      prisma.document.count({ where: { status: DS.EXPIRADO } }),
      prisma.document.count({ where: { status: DS.CANCELADO } }),
      prisma.document.count({ where: { status: { in: [DS.ASSINADO, DS.FINALIZADO] }, signedAt: { gte: hoje } } }),
      prisma.document.count({ where: { status: { in: [DS.ASSINADO, DS.FINALIZADO] }, signedAt: { gte: mesInicio } } }),
    ])

  const taxaConversao = total > 0 ? Math.round((assinados / total) * 100) : 0

  const evolucaoDiaria = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      const fim = new Date(d)
      fim.setHours(23, 59, 59, 999)
      return prisma.document.count({
        where: { status: { in: [DS.ASSINADO, DS.FINALIZADO] }, signedAt: { gte: d, lte: fim } },
      }).then(count => ({ data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), assinados: count }))
    })
  )

  return { total, enviados, visualizados, assinados, expirados, cancelados, hoje_assinados, mes_assinados, taxaConversao, evolucaoDiaria }
}
