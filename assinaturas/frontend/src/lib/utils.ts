import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export const STATUS_LABELS: Record<string, string> = {
  CRIADO: 'Criado',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
  LINK_ABERTO: 'Link Aberto',
  DADOS_CONFERIDOS: 'Dados Conferidos',
  DOCUMENTO_VISUALIZADO: 'Visualizado',
  ASSINATURA_INICIADA: 'Assinando...',
  ASSINADO: 'Assinado',
  FINALIZADO: 'Finalizado',
  EXPIRADO: 'Expirado',
  CANCELADO: 'Cancelado',
}

export const STATUS_COLORS: Record<string, string> = {
  CRIADO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ENVIADO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ENTREGUE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  LINK_ABERTO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DADOS_CONFERIDOS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DOCUMENTO_VISUALIZADO: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ASSINATURA_INICIADA: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ASSINADO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FINALIZADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELADO: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}
