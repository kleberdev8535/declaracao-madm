import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { createDocument, getDocuments, getDocumentByToken, getDocumentById, updateDocumentStatus, getDashboardMetrics, DS } from '../services/documentService'
import { generateSignedPdf, hashSignature } from '../services/pdfService'
import { Server as SocketServer } from 'socket.io'

export function createDocumentRouter(io: SocketServer) {
  const router = Router()

  router.get('/dashboard', async (_req: Request, res: Response) => {
    try {
      res.json(await getDashboardMetrics())
    } catch {
      res.status(500).json({ error: 'Erro ao buscar métricas' })
    }
  })

  router.get('/', async (req: Request, res: Response) => {
    try {
      const result = await getDocuments({
        status: req.query.status as string | undefined,
        clienteId: req.query.clienteId as string | undefined,
        responsavel: req.query.responsavel as string | undefined,
        advogado: req.query.advogado as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
      res.json(result)
    } catch {
      res.status(500).json({ error: 'Erro ao buscar documentos' })
    }
  })

  router.post('/', async (req: Request, res: Response) => {
    try {
      const document = await createDocument(req.body)
      io.emit('document:created', document)
      res.status(201).json(document)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar documento'
      res.status(400).json({ error: message })
    }
  })

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentById(req.params.id)
      if (!doc) return res.status(404).json({ error: 'Documento não encontrado' })
      res.json(doc)
    } catch {
      res.status(500).json({ error: 'Erro ao buscar documento' })
    }
  })

  router.patch('/:id/cancelar', async (req: Request, res: Response) => {
    try {
      const doc = await updateDocumentStatus(req.params.id, DS.CANCELADO, {
        ip: req.ip, descricao: 'Documento cancelado pelo operador',
      })
      io.emit('document:updated', doc)
      res.json(doc)
    } catch {
      res.status(500).json({ error: 'Erro ao cancelar' })
    }
  })

  router.patch('/:id/reenviar', async (req: Request, res: Response) => {
    try {
      const { v4: uuidv4 } = await import('uuid')
      const token = uuidv4()
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000'
      const doc = await prisma.document.update({
        where: { id: req.params.id },
        data: { token, linkAssinatura: `${baseUrl}/assinar/${token}`, status: DS.ENVIADO },
        include: { cliente: true },
      })
      await prisma.auditEvent.create({
        data: { documentId: doc.id, status: DS.ENVIADO, descricao: 'Documento reenviado' },
      })
      io.emit('document:updated', doc)
      res.json(doc)
    } catch {
      res.status(500).json({ error: 'Erro ao reenviar' })
    }
  })

  router.get('/:id/pdf', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentById(req.params.id)
      if (!doc || !doc.pdfAssinadoPath) return res.status(404).json({ error: 'PDF não disponível' })
      res.download(doc.pdfAssinadoPath)
    } catch {
      res.status(500).json({ error: 'Erro ao baixar PDF' })
    }
  })

  return router
}

export function createPublicRouter(io: SocketServer) {
  const router = Router()

  router.get('/assinar/:token', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentByToken(req.params.token)
      if (!doc) return res.status(404).json({ error: 'Link inválido ou expirado' })

      if (doc.expiresAt && doc.expiresAt < new Date()) {
        await updateDocumentStatus(doc.id, DS.EXPIRADO, { ip: req.ip, descricao: 'Link expirado' })
        return res.status(410).json({ error: 'Link expirado' })
      }
      if (([DS.ASSINADO, DS.FINALIZADO] as string[]).includes(doc.status)) {
        return res.status(409).json({ error: 'Documento já foi assinado' })
      }
      if (doc.status === DS.CANCELADO) {
        return res.status(410).json({ error: 'Documento cancelado' })
      }

      if (([DS.CRIADO, DS.ENVIADO, DS.ENTREGUE] as string[]).includes(doc.status)) {
        await updateDocumentStatus(doc.id, DS.LINK_ABERTO, {
          ip: req.ip || '', userAgent: req.headers['user-agent'],
          descricao: 'Cliente abriu o link de assinatura',
        })
        io.emit('document:updated', { id: doc.id, status: DS.LINK_ABERTO })
      }

      res.json({
        id: doc.id, titulo: doc.titulo, conteudo: doc.conteudo,
        protocolo: doc.protocolo, status: doc.status,
        cliente: doc.cliente, expiresAt: doc.expiresAt,
      })
    } catch {
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  router.post('/assinar/:token/confirmar-dados', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentByToken(req.params.token)
      if (!doc) return res.status(404).json({ error: 'Link inválido' })
      await updateDocumentStatus(doc.id, DS.DADOS_CONFERIDOS, {
        ip: req.ip || '', userAgent: req.headers['user-agent'],
        descricao: 'Cliente confirmou os dados pessoais',
      })
      io.emit('document:updated', { id: doc.id, status: DS.DADOS_CONFERIDOS })
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  router.post('/assinar/:token/visualizou', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentByToken(req.params.token)
      if (!doc) return res.status(404).json({ error: 'Link inválido' })
      await updateDocumentStatus(doc.id, DS.DOCUMENTO_VISUALIZADO, {
        ip: req.ip || '', userAgent: req.headers['user-agent'],
        descricao: 'Cliente visualizou o documento completo',
      })
      io.emit('document:updated', { id: doc.id, status: DS.DOCUMENTO_VISUALIZADO })
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  router.post('/assinar/:token/iniciou-assinatura', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentByToken(req.params.token)
      if (!doc) return res.status(404).json({ error: 'Link inválido' })
      await updateDocumentStatus(doc.id, DS.ASSINATURA_INICIADA, {
        ip: req.ip || '', descricao: 'Cliente iniciou o processo de assinatura',
      })
      io.emit('document:updated', { id: doc.id, status: DS.ASSINATURA_INICIADA })
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  router.post('/assinar/:token/assinar', async (req: Request, res: Response) => {
    try {
      const doc = await getDocumentByToken(req.params.token)
      if (!doc) return res.status(404).json({ error: 'Link inválido' })
      if (!doc.protocolo || !doc.hashDocumento) return res.status(400).json({ error: 'Documento inválido' })

      const { imagemBase64, timezone, latitude, longitude } = req.body
      if (!imagemBase64) return res.status(400).json({ error: 'Assinatura é obrigatória' })

      const ip = req.ip || 'desconhecido'
      const userAgent = req.headers['user-agent'] || ''
      const hashAssinatura = hashSignature(imagemBase64)
      const signedAt = new Date()

      await prisma.signature.create({
        data: { documentId: doc.id, imagemBase64, ip, userAgent, timezone, latitude, longitude, hash: hashAssinatura },
      })

      const baseUrl = process.env.BASE_URL || 'http://localhost:4000'
      const pdfPath = await generateSignedPdf({
        conteudo: doc.conteudo,
        nome: doc.cliente.nome,
        cpf: doc.cliente.cpf,
        protocolo: doc.protocolo,
        hashDocumento: doc.hashDocumento,
        assinaturaBase64: imagemBase64,
        hashAssinatura,
        ip,
        signedAt,
        linkValidacao: `${baseUrl}/validar/${doc.protocolo}`,
      })

      await prisma.document.update({
        where: { id: doc.id },
        data: { status: DS.ASSINADO, signedAt, hashAssinatura, pdfAssinadoPath: pdfPath },
      })

      await prisma.auditEvent.create({
        data: {
          documentId: doc.id, status: DS.ASSINADO, ip, userAgent, timezone,
          descricao: 'Documento assinado com sucesso',
          metadata: JSON.stringify({ hashAssinatura, pdfPath }),
        },
      })

      io.emit('document:signed', { id: doc.id, status: DS.ASSINADO, protocolo: doc.protocolo })
      io.emit('notification', { tipo: 'assinado', titulo: 'Documento assinado!', mensagem: `${doc.cliente.nome} assinou "${doc.titulo}"` })

      res.json({ ok: true, protocolo: doc.protocolo, hashAssinatura, signedAt })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Erro ao processar assinatura' })
    }
  })

  router.get('/validar/:protocolo', async (req: Request, res: Response) => {
    try {
      const doc = await prisma.document.findUnique({
        where: { protocolo: req.params.protocolo },
        include: { cliente: true, assinatura: true, eventos: { orderBy: { createdAt: 'asc' } } },
      })
      if (!doc) return res.status(404).json({ error: 'Protocolo não encontrado' })
      res.json({
        protocolo: doc.protocolo, titulo: doc.titulo, status: doc.status,
        cliente: { nome: doc.cliente.nome, cpf: doc.cliente.cpf },
        signedAt: doc.signedAt, hashDocumento: doc.hashDocumento, hashAssinatura: doc.hashAssinatura,
        valido: ([DS.ASSINADO, DS.FINALIZADO] as string[]).includes(doc.status),
      })
    } catch {
      res.status(500).json({ error: 'Erro ao validar protocolo' })
    }
  })

  return router
}
