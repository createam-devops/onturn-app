'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getUserBusinesses } from '@/lib/services/admin'
import {
  getBusinessMetrics,
  getAppointmentsTrendData,
  getHourlyDistribution,
  getSpecialtyDistribution,
  getSpecialistPerformance,
  getMonthComparison,
  type AnalyticsMetrics,
  type TimeSeriesData,
  type HourlyDistribution as HourlyDist,
  type SpecialtyDistribution as SpecialtyDist,
  type SpecialistPerformance
} from '@/lib/services/analytics'
import { MetricCard } from '@/components/analytics/MetricCard'
import { AppointmentsTrendChart } from '@/components/analytics/AppointmentsTrendChart'
import { HourlyDistributionChart } from '@/components/analytics/HourlyDistributionChart'
import { SpecialtyDistributionChart } from '@/components/analytics/SpecialtyDistributionChart'
import { SpecialistPerformanceTable } from '@/components/analytics/SpecialistPerformanceTable'
import { DateRangeSelect } from '@/components/analytics/DateRangeSelect'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Star,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [trendData, setTrendData] = useState<TimeSeriesData[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyDist[]>([])
  const [specialtyData, setSpecialtyData] = useState<SpecialtyDist[]>([])
  const [specialistData, setSpecialistData] = useState<SpecialistPerformance[]>([])
  const [comparison, setComparison] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [_businessId, setBusinessId] = useState<string>('')
  const [dateRange, setDateRange] = useState<number>(30)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (!loading && isAuthenticated && !isBusinessOwner) {
      router.push('/admin/dashboard')
    }
  }, [isBusinessOwner, loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && isBusinessOwner && user) {
      loadAnalyticsData()
    }
  }, [isAuthenticated, isBusinessOwner, user, dateRange])

  const loadAnalyticsData = async () => {
    try {
      setLoadingData(true)

      const businesses = await getUserBusinesses(user!.id)
      if (businesses.length === 0) {
        return
      }

      const currentBusiness = businesses[0]
      setBusinessId(currentBusiness.id)

      // Cargar todas las métricas en paralelo
      const [metricsData, trend, hourly, specialty, specialists, comp] = await Promise.all([
        getBusinessMetrics(currentBusiness.id),
        getAppointmentsTrendData(currentBusiness.id, dateRange),
        getHourlyDistribution(currentBusiness.id, dateRange),
        getSpecialtyDistribution(currentBusiness.id, dateRange),
        getSpecialistPerformance(currentBusiness.id, dateRange),
        getMonthComparison(currentBusiness.id)
      ])

      setMetrics(metricsData)
      setTrendData(trend)
      setHourlyData(hourly)
      setSpecialtyData(specialty)
      setSpecialistData(specialists)
      setComparison(comp)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A896] mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isBusinessOwner) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
              <p className="text-slate-600 mt-1">
                Métricas y análisis de tu negocio
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAnalyticsData}
                icon={RefreshCw}
              >
                Actualizar
              </Button>
              <Button
                variant="accent"
                size="sm"
                icon={Download}
              >
                Exportar
              </Button>
            </div>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Período:</span>
            <DateRangeSelect value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total de Citas"
            value={metrics?.totalAppointments || 0}
            subtitle={`${metrics?.completedAppointments || 0} completadas`}
            icon={<Calendar size={24} />}
            color="blue"
            trend={comparison ? {
              value: comparison.change,
              label: 'vs mes anterior'
            } : undefined}
          />
          
          <MetricCard
            title="Ingresos Estimados"
            value={`$${metrics?.totalRevenue.toLocaleString() || 0}`}
            subtitle="Últimos 30 días"
            icon={<DollarSign size={24} />}
            color="green"
          />
          
          <MetricCard
            title="Tasa de Ocupación"
            value={`${metrics?.occupancyRate || 0}%`}
            subtitle={`${metrics?.pendingAppointments || 0} pendientes`}
            icon={<TrendingUp size={24} />}
            color="purple"
          />
          
          <MetricCard
            title="Calificación"
            value={metrics?.averageRating.toFixed(1) || '0.0'}
            subtitle={`${metrics?.totalReviews || 0} opiniones`}
            icon={<Star size={24} />}
            color="orange"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Clientes Nuevos"
            value={metrics?.newCustomers || 0}
            subtitle="Primer visita"
            icon={<Users size={20} />}
            color="teal"
          />
          
          <MetricCard
            title="Clientes Recurrentes"
            value={metrics?.returningCustomers || 0}
            subtitle="Más de una visita"
            icon={<Users size={20} />}
            color="blue"
          />
          
          <MetricCard
            title="Citas Canceladas"
            value={metrics?.cancelledAppointments || 0}
            subtitle={`${metrics?.totalAppointments ? Math.round((metrics.cancelledAppointments / metrics.totalAppointments) * 100) : 0}% del total`}
            color="orange"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AppointmentsTrendChart data={trendData} />
          <HourlyDistributionChart data={hourlyData} />
        </div>

        {/* Specialty Distribution */}
        {specialtyData.length > 0 && (
          <div className="mb-8">
            <SpecialtyDistributionChart data={specialtyData} />
          </div>
        )}

        {/* Specialist Performance Table */}
        {specialistData.length > 0 && (
          <div className="mb-8">
            <SpecialistPerformanceTable data={specialistData} />
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">
              Resumen de Estados
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Completadas</span>
                <span className="text-sm font-bold text-green-600">
                  {metrics?.completedAppointments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Pendientes</span>
                <span className="text-sm font-bold text-blue-600">
                  {metrics?.pendingAppointments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Canceladas</span>
                <span className="text-sm font-bold text-red-600">
                  {metrics?.cancelledAppointments || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">
              Tasa de Retención
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#003366] mb-2">
                {metrics && metrics.newCustomers + metrics.returningCustomers > 0
                  ? Math.round((metrics.returningCustomers / (metrics.newCustomers + metrics.returningCustomers)) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-slate-600">
                de clientes vuelven
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">
              Comparación Mensual
            </h3>
            {comparison && (
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  comparison.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.change > 0 ? '+' : ''}{comparison.change}%
                </div>
                <p className="text-sm text-slate-600">
                  {comparison.current} vs {comparison.previous} (mes anterior)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
