import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSocket } from '@/hooks/useSocket'

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral em tempo real' },
  '/documentos': { title: 'Documentos', subtitle: 'Gerencie todos os documentos' },
  '/modelos': { title: 'Modelos', subtitle: 'Templates de documentos' },
  '/assinaturas': { title: 'Central de Assinaturas', subtitle: 'Acompanhe as assinaturas em tempo real' },
  '/clientes': { title: 'Clientes', subtitle: 'Base de clientes cadastrados' },
  '/relatorios': { title: 'Relatórios', subtitle: 'Análises e estatísticas' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Ajustes do sistema' },
  '/auditoria': { title: 'Logs de Auditoria', subtitle: 'Histórico imutável de eventos' },
}

export function Layout() {
  useSocket() // Inicializa WebSocket e invalida queries automaticamente
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || { title: 'Central de Assinaturas' }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={page.title} subtitle={page.subtitle} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
