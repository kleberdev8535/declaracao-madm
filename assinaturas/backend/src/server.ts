import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import http from 'http'
import path from 'path'
import { Server as SocketServer } from 'socket.io'
import { createDocumentRouter, createPublicRouter } from './routes/documents'
import templateRouter from './routes/templates'
import clientRouter from './routes/clients'
import auditRouter from './routes/audit'

const PORT = process.env.PORT || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()
const httpServer = http.createServer(app)
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: '*' }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Servir uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Rotas da API interna
app.use('/api/documents', createDocumentRouter(io))
app.use('/api/templates', templateRouter)
app.use('/api/clients', clientRouter)
app.use('/api/audit', auditRouter)

// Rotas públicas (cliente)
app.use('/', createPublicRouter(io))

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`)
  socket.on('disconnect', () => console.log(`❌ Cliente desconectado: ${socket.id}`))
})

httpServer.listen(PORT, () => {
  console.log(`🚀 Central de Assinaturas - Backend rodando na porta ${PORT}`)
  console.log(`📡 WebSocket ativo`)
  console.log(`🌐 Frontend: ${CLIENT_ORIGIN}`)
})

export { io }
