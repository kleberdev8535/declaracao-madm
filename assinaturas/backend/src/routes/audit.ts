import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const documentId = req.query.documentId as string | undefined
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const skip = (page - 1) * limit

    const where = documentId ? { documentId } : {}
    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        include: { document: { select: { titulo: true, protocolo: true, cliente: { select: { nome: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ])

    res.json({ events, total, page, pages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' })
  }
})

router.get('/document/:id', async (req: Request, res: Response) => {
  try {
    const events = await prisma.auditEvent.findMany({
      where: { documentId: req.params.id },
      orderBy: { createdAt: 'asc' },
    })
    res.json(events)
  } catch {
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
