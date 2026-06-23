import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined
    const where = search
      ? { OR: [{ nome: { contains: search, mode: 'insensitive' as const } }, { cpf: { contains: search } }] }
      : {}
    const clients = await prisma.client.findMany({
      where,
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(clients)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar clientes' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { documents: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
    res.json(client)
  } catch {
    res.status(500).json({ error: 'Erro interno' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body })
    res.json(client)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar cliente' })
  }
})

export default router
