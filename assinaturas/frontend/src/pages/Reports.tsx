import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '@/lib/api'
import { STATUS_LABELS } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/Skeleton'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

interface Metrics {
  total: number
  enviados: number
  visualizados: number
  assinados: number
  expirados: number
  cancelados: number
  hoje_assinados: number
  mes_assinados: number
  taxaConversao: number
  evolucaoDiaria: { data: string; assinados: number }[]
}

export default function Reports() {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['dashboard'],
    queryFn: documentsApi.dashboard,
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (!metrics) return null

  const pieData = [
    { name: 'Assinados', value: metrics.assinados },
    { name: 'Enviados', value: metrics.enviados },
    { name: 'Visualizados', value: metrics.visualizados },
    { name: 'Expirados', value: metrics.expirados },
    { name: 'Cancelados', value: metrics.cancelados },
  ].filter(d => d.value > 0)

  const statCards = [
    { label: 'Total de documentos', value: metrics.total, icon: <FileText size={18} />, color: 'text-blue-500' },
    { label: 'Assinados', value: metrics.assinados, icon: <CheckCircle2 size={18} />, color: 'text-green-500' },
    { label: 'Pendentes', value: metrics.enviados + metrics.visualizados, icon: <Clock size={18} />, color: 'text-amber-500' },
    { label: 'Expirados', value: metrics.expirados, icon: <XCircle size={18} />, color: 'text-red-500' },
    { label: 'Assinados hoje', value: metrics.hoje_assinados, icon: <TrendingUp size={18} />, color: 'text-purple-500' },
    { label: 'Assinados no mês', value: metrics.mes_assinados, icon: <TrendingUp size={18} />, color: 'text-indigo-500' },
    { label: 'Taxa de conversão', value: `${metrics.taxaConversao}%`, icon: <TrendingUp size={18} />, color: 'text-emerald-500' },
    { label: 'Cancelados', value: metrics.cancelados, icon: <XCircle size={18} />, color: 'text-slate-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5">
            <div className={`${color} mb-3`}>{icon}</div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Evolução diária */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <p className="font-semibold text-foreground mb-4">Assinaturas — últimos 7 dias</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.evolucaoDiaria} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="assinados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Assinados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por status */}
        {pieData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="font-semibold text-foreground mb-4">Distribuição por status</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
