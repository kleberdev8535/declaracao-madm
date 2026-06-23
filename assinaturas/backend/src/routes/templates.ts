import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: { ativo: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(templates)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar templates' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const t = await prisma.template.findUnique({ where: { id: req.params.id } })
    if (!t) return res.status(404).json({ error: 'Template não encontrado' })
    res.json(t)
  } catch {
    res.status(500).json({ error: 'Erro interno' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, descricao, categoria, conteudo } = req.body
    const variaveis = JSON.stringify(Array.from(conteudo.matchAll(/\{\{(\w+)\}\}/g)).map((m) => (m as RegExpMatchArray)[1]))
    const t = await prisma.template.create({
      data: { nome, descricao, categoria, conteudo, variaveis },
    })
    res.status(201).json(t)
  } catch {
    res.status(500).json({ error: 'Erro ao criar template' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, descricao, categoria, conteudo, ativo } = req.body
    const variaveis = conteudo ? JSON.stringify(Array.from(conteudo.matchAll(/\{\{(\w+)\}\}/g)).map((m) => (m as RegExpMatchArray)[1])) : undefined
    const t = await prisma.template.update({
      where: { id: req.params.id },
      data: { nome, descricao, categoria, conteudo, variaveis, ativo },
    })
    res.json(t)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar template' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.template.update({ where: { id: req.params.id }, data: { ativo: false } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erro ao arquivar template' })
  }
})

export default router
