import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

let globalSocket: Socket | null = null

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] })
  }
  return globalSocket
}

export function useSocket() {
  const qc = useQueryClient()
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = socketRef.current

    socket.on('document:created', () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('document:updated', () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('document:signed', () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    })

    return () => {
      socket.off('document:created')
      socket.off('document:updated')
      socket.off('document:signed')
    }
  }, [qc])

  return socketRef.current
}

export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = socketRef.current
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [event, handler])
}
