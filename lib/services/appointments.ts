import { createClient } from '@/lib/supabase/client'
import type { Appointment, AppointmentWithRelations, AppointmentStatus } from '@/types/appointment'
import { addMinutes, format, isAfter, isBefore, isSameDay, parseISO, set } from 'date-fns'

const supabase = createClient()

export async function getUserAppointments(userId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      businesses (
        id,
        name,
        slug,
        address,
        city,
        phone,
        email
      ),
      specialists (
        id,
        name,
        specialty
      )
    `)
    .eq('user_id', userId)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) throw error

  // Transformar datos
  return data.map(apt => ({
    ...apt,
    business_name: apt.businesses?.name,
    business_slug: apt.businesses?.slug,
    business_address: apt.businesses?.address,
    business_city: apt.businesses?.city,
    business_phone: apt.businesses?.phone,
    business_email: apt.businesses?.email,
    specialist_name: apt.specialists?.name,
    specialty_name: apt.specialists?.specialty,
  })) as AppointmentWithRelations[]
}

export async function getAppointmentById(appointmentId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      businesses (
        id,
        name,
        slug,
        address,
        city,
        phone,
        email
      ),
      specialists (
        id,
        name,
        specialty
      )
    `)
    .eq('id', appointmentId)
    .single()

  if (error) throw error

  // Transformar datos
  return {
    ...data,
    business_name: data.businesses?.name,
    business_slug: data.businesses?.slug,
    business_address: data.businesses?.address,
    business_city: data.businesses?.city,
    business_phone: data.businesses?.phone,
    business_email: data.businesses?.email,
    specialist_name: data.specialists?.name,
    specialty_name: data.specialists?.specialty,
  } as AppointmentWithRelations
}

export async function createAppointment(appointmentData: {
  business_id: string
  specialist_id?: string
  user_id?: string
  customer_name: string
  customer_email: string
  customer_phone: string
  appointment_date: string
  appointment_time: string
  notes?: string
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...appointmentData,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as Appointment
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) throw error
  return data as Appointment
}

export async function getAvailableSlots(
  businessId: string,
  date: string,
  specialistId?: string
): Promise<string[]> {
  try {
    // Obtener configuración del negocio
    const { data: settings } = await supabase
      .from('business_settings')
      .select('slot_duration')
      .eq('business_id', businessId)
      .single()

    const slotDuration = settings?.slot_duration || 30

    // Obtener el día de la semana de la fecha seleccionada
    const dateObj = parseISO(date)
    const dayOfWeek = dateObj.getDay()

    // 1. Obtener horarios del negocio para ese día
    const { data: dayHours } = await supabase
      .from('business_hours')
      .select('open_time, close_time, is_closed')
      .eq('business_id', businessId)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (!dayHours || dayHours.is_closed || !dayHours.open_time || !dayHours.close_time) {
      return []
    }

    // 2. Obtener disponibilidad del especialista (si se especificó)
    let specialistAvailability: Array<{ start_time: string; end_time: string }> = []
    
    if (specialistId && specialistId !== 'any') {
      const { data: availability } = await supabase
        .from('specialist_availability')
        .select('start_time, end_time')
        .eq('specialist_id', specialistId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)

      specialistAvailability = availability || []

      // Si el especialista no tiene disponibilidad configurada para este día, no hay slots
      if (specialistAvailability.length === 0) {
        return []
      }

      // 3. Verificar bloqueos específicos del especialista para esta fecha
      const { data: blockedSlots } = await supabase
        .from('specialist_blocked_slots')
        .select('start_time, end_time')
        .eq('specialist_id', specialistId)
        .eq('blocked_date', date)

      if (blockedSlots && blockedSlots.length > 0) {
        // Si hay un bloqueo de día completo (start_time y end_time null)
        const fullDayBlock = blockedSlots.some(block => !block.start_time && !block.end_time)
        if (fullDayBlock) {
          return [] // Día completamente bloqueado
        }
      }
    }

    // 4. Obtener citas existentes para esa fecha
    const startOfDayStr = `${date}T00:00:00`
    const endOfDayStr = `${date}T23:59:59`

    let query = supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', startOfDayStr)
      .lte('start_time', endOfDayStr)

    if (specialistId && specialistId !== 'any') {
      query = query.eq('specialist_id', specialistId)
    }

    const { data: appointments } = await query

    // 5. Generar slots basados en horarios del negocio
    const slots: string[] = []

    // Parsear horas de apertura/cierre del negocio
    const [openHour, openMinute] = dayHours.open_time.split(':').map(Number)
    const [closeHour, closeMinute] = dayHours.close_time.split(':').map(Number)

    let currentSlot = set(dateObj, {
      hours: openHour,
      minutes: openMinute,
      seconds: 0,
      milliseconds: 0
    })

    const closeTime = set(dateObj, {
      hours: closeHour,
      minutes: closeMinute,
      seconds: 0,
      milliseconds: 0
    })

    const now = new Date()

    // 6. Iterar generando slots y validando disponibilidad
    while (isBefore(currentSlot, closeTime)) {
      const endOfSlot = addMinutes(currentSlot, slotDuration)

      // Verificar que el slot no exceda el horario de cierre
      if (isAfter(endOfSlot, closeTime)) break

      // Filtrar horarios pasados si es hoy
      if (isSameDay(dateObj, now) && isBefore(currentSlot, now)) {
        currentSlot = addMinutes(currentSlot, slotDuration)
        continue
      }

      const slotTimeStr = format(currentSlot, 'HH:mm:ss')

      // 7. Verificar si el slot está dentro de la disponibilidad del especialista
      let isWithinSpecialistAvailability = true
      
      if (specialistId && specialistId !== 'any' && specialistAvailability.length > 0) {
        isWithinSpecialistAvailability = specialistAvailability.some(avail => {
          return slotTimeStr >= avail.start_time && slotTimeStr < avail.end_time
        })
      }

      if (!isWithinSpecialistAvailability) {
        currentSlot = addMinutes(currentSlot, slotDuration)
        continue
      }

      // 8. Verificar colisiones con citas existentes
      const isOccupied = appointments?.some(app => {
        const appStart = new Date(app.start_time)
        const appEnd = new Date(app.end_time)
        return isBefore(currentSlot, appEnd) && isAfter(endOfSlot, appStart)
      })

      if (!isOccupied) {
        slots.push(format(currentSlot, 'HH:mm'))
      }

      currentSlot = addMinutes(currentSlot, slotDuration)
    }

    return slots

  } catch (error) {
    console.error('Error fetching available slots:', error)
    return []
  }
}
