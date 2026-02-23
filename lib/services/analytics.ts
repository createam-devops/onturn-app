import { createClient } from '@/lib/supabase/client'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

// Interfaces
export interface AnalyticsMetrics {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  pendingAppointments: number
  occupancyRate: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  newCustomers: number
  returningCustomers: number
}

export interface TimeSeriesData {
  date: string
  appointments: number
  revenue: number
}

export interface HourlyDistribution {
  hour: string
  count: number
}

export interface SpecialtyDistribution {
  name: string
  count: number
  percentage: number
}

export interface SpecialistPerformance {
  id: string
  name: string
  totalAppointments: number
  completedAppointments: number
  averageRating: number
  revenue: number
}

/**
 * Obtener métricas generales del negocio
 */
export async function getBusinessMetrics(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsMetrics> {
  const supabase = createClient()

  const start = startDate ? startOfDay(startDate) : subDays(new Date(), 30)
  const end = endDate ? endOfDay(endDate) : new Date()

  try {
    // Total de citas
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, status, created_at, user_id')
      .eq('business_id', businessId)
      .gte('appointment_date', start.toISOString())
      .lte('appointment_date', end.toISOString())

    if (appointmentsError) throw appointmentsError

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
    const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
    const pendingAppointments = appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed').length || 0

    // Clientes únicos
    const uniqueCustomers = new Set(appointments?.map(a => a.user_id) || [])
    
    // Clientes nuevos vs recurrentes
    const customerAppointmentCounts = new Map<string, number>()
    appointments?.forEach(a => {
      const count = customerAppointmentCounts.get(a.user_id) || 0
      customerAppointmentCounts.set(a.user_id, count + 1)
    })
    
    const newCustomers = Array.from(customerAppointmentCounts.values()).filter(count => count === 1).length
    const returningCustomers = uniqueCustomers.size - newCustomers

    // Tasa de ocupación (slots reservados / slots disponibles)
    // Simplificado: ratio de completadas + confirmadas vs total
    const occupiedSlots = appointments?.filter(a => 
      a.status === 'completed' || a.status === 'confirmed'
    ).length || 0
    const occupancyRate = totalAppointments > 0 
      ? Math.round((occupiedSlots / totalAppointments) * 100) 
      : 0

    // Revenue estimado (precio promedio × citas completadas)
    // Asumimos $50 por cita - esto debería venir de la BD
    const averagePrice = 50
    const totalRevenue = completedAppointments * averagePrice

    // Rating promedio
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId)
      .eq('is_visible', true)

    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      occupancyRate,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews?.length || 0,
      newCustomers,
      returningCustomers
    }
  } catch (error) {
    console.error('Error getting business metrics:', error)
    throw error
  }
}

/**
 * Obtener serie temporal de citas (últimos N días)
 */
export async function getAppointmentsTrendData(
  businessId: string,
  days: number = 30
): Promise<TimeSeriesData[]> {
  const supabase = createClient()
  const averagePrice = 50

  try {
    const startDate = subDays(new Date(), days)
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('business_id', businessId)
      .gte('appointment_date', startDate.toISOString())
      .order('appointment_date', { ascending: true })

    if (error) throw error

    // Agrupar por fecha
    const dateMap = new Map<string, { appointments: number; revenue: number }>()
    
    // Inicializar todos los días
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i - 1)
      const dateStr = format(date, 'yyyy-MM-dd')
      dateMap.set(dateStr, { appointments: 0, revenue: 0 })
    }

    // Contar citas por día
    appointments?.forEach(appointment => {
      const dateStr = format(new Date(appointment.appointment_date), 'yyyy-MM-dd')
      const current = dateMap.get(dateStr) || { appointments: 0, revenue: 0 }
      current.appointments += 1
      if (appointment.status === 'completed') {
        current.revenue += averagePrice
      }
      dateMap.set(dateStr, current)
    })

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date: format(new Date(date), 'dd/MM'),
      appointments: data.appointments,
      revenue: data.revenue
    }))
  } catch (error) {
    console.error('Error getting appointments trend:', error)
    throw error
  }
}

/**
 * Obtener distribución horaria de citas
 */
export async function getHourlyDistribution(
  businessId: string,
  days: number = 30
): Promise<HourlyDistribution[]> {
  const supabase = createClient()

  try {
    const startDate = subDays(new Date(), days)
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('business_id', businessId)
      .gte('appointment_date', startDate.toISOString())

    if (error) throw error

    // Agrupar por hora
    const hourMap = new Map<number, number>()
    
    appointments?.forEach(appointment => {
      const hour = parseInt(appointment.appointment_time.split(':')[0])
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
    })

    // Generar array de 8am a 8pm
    const result: HourlyDistribution[] = []
    for (let hour = 8; hour <= 20; hour++) {
      result.push({
        hour: `${hour}:00`,
        count: hourMap.get(hour) || 0
      })
    }

    return result
  } catch (error) {
    console.error('Error getting hourly distribution:', error)
    throw error
  }
}

/**
 * Obtener distribución por especialidad
 */
export async function getSpecialtyDistribution(
  businessId: string,
  days: number = 30
): Promise<SpecialtyDistribution[]> {
  const supabase = createClient()

  try {
    const startDate = subDays(new Date(), days)
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        specialists (
          id,
          specialties (
            id,
            name
          )
        )
      `)
      .eq('business_id', businessId)
      .gte('appointment_date', startDate.toISOString())

    if (error) throw error

    // Contar por especialidad
    const specialtyMap = new Map<string, number>()
    let total = 0

    appointments?.forEach((appointment: any) => {
      const specialtyName = appointment.specialists?.specialties?.name
      if (specialtyName) {
        specialtyMap.set(specialtyName, (specialtyMap.get(specialtyName) || 0) + 1)
        total += 1
      }
    })

    // Convertir a array con porcentajes
    return Array.from(specialtyMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('Error getting specialty distribution:', error)
    throw error
  }
}

/**
 * Obtener rendimiento de especialistas
 */
export async function getSpecialistPerformance(
  businessId: string,
  days: number = 30
): Promise<SpecialistPerformance[]> {
  const supabase = createClient()
  const averagePrice = 50

  try {
    const startDate = subDays(new Date(), days)
    
    // Obtener especialistas del negocio
    const { data: specialists, error: specialistsError } = await supabase
      .from('specialists')
      .select('id, name')
      .eq('business_id', businessId)

    if (specialistsError) throw specialistsError

    const performance: SpecialistPerformance[] = []

    for (const specialist of specialists || []) {
      // Citas del especialista
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('specialist_id', specialist.id)
        .gte('appointment_date', startDate.toISOString())

      const totalAppointments = appointments?.length || 0
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0

      // Rating promedio
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', businessId)
        .eq('is_visible', true)

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

      performance.push({
        id: specialist.id,
        name: specialist.name,
        totalAppointments,
        completedAppointments,
        averageRating: Math.round(averageRating * 10) / 10,
        revenue: completedAppointments * averagePrice
      })
    }

    return performance.sort((a, b) => b.totalAppointments - a.totalAppointments)
  } catch (error) {
    console.error('Error getting specialist performance:', error)
    throw error
  }
}

/**
 * Obtener comparación mes actual vs mes anterior
 */
export async function getMonthComparison(businessId: string) {
  const supabase = createClient()
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  try {
    // Mes actual
    const { data: currentMonth } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('business_id', businessId)
      .gte('appointment_date', startOfCurrentMonth.toISOString())

    // Mes anterior
    const { data: lastMonth } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('business_id', businessId)
      .gte('appointment_date', startOfLastMonth.toISOString())
      .lte('appointment_date', endOfLastMonth.toISOString())

    const currentTotal = currentMonth?.length || 0
    const lastTotal = lastMonth?.length || 0
    const change = lastTotal > 0 
      ? Math.round(((currentTotal - lastTotal) / lastTotal) * 100)
      : 0

    return {
      current: currentTotal,
      previous: lastTotal,
      change,
      trend: change >= 0 ? 'up' : 'down'
    }
  } catch (error) {
    console.error('Error getting month comparison:', error)
    throw error
  }
}
