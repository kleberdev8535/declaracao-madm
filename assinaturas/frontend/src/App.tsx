import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import Templates from '@/pages/Templates'
import Signatures from '@/pages/Signatures'
import Clients from '@/pages/Clients'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import AuditLogs from '@/pages/AuditLogs'
import SignPage from '@/pages/SignPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function DashboardPlaceholder() {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <p className="text-lg font-semibold">Dashboard</p>
      <p className="text-sm mt-1">Em breve — acesse Assinaturas para começar</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Rota pública do cliente */}
          <Route path="/assinar/:token" element={<SignPage />} />

          {/* Painel interno */}
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPlaceholder />} />
            <Route path="/documentos" element={<Signatures />} />
            <Route path="/modelos" element={<Templates />} />
            <Route path="/assinaturas" element={<Signatures />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/auditoria" element={<AuditLogs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
