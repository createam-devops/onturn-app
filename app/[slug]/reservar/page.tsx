'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getBusinessBySlug, getBusinessHours } from '@/lib/services/businesses'
import { getSpecialistsByBusiness } from '@/lib/services/specialists'
import { getSpecialtiesByBusiness, type Specialty } from '@/lib/services/specialties'
import { createAppointment, getAvailableSlots } from '@/lib/services/appointments'
import { useToast } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CheckCircle, Calendar, Clock, User, Phone, Mail, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PublicHeader } from '@/components/public/PublicHeader'
import { reservaSchema } from '@/lib/schemas'
import type { Business, BusinessHours } from '@/types/business'
import type { Specialist } from '@/types/specialist'

// export const dynamic = 'force-dynamic' // Removed in favor of Suspense

function ReservarPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { success, error: showError } = useToast()

  const [business, setBusiness] = useState<Business | null>(null)
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    specialist_id: '',
    specialty_id: '',
    appointment_date: '',
    appointment_time: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const queryString = searchParams.toString()
      router.push(`/login?redirect=/${slug}/reservar&${queryString}`)
      return
    }

    if (slug) {
      loadBusinessData()
    }
  }, [slug, isAuthenticated, authLoading])

  // Efecto para leer parametros de URL una sola vez al inicio
  useEffect(() => {
    if (!searchParams) return

    const dateParam = searchParams.get('date')
    const timeParam = searchParams.get('time')
    const specialistParam = searchParams.get('specialist')
    const specialtyParam = searchParams.get('specialty')

    if (dateParam || timeParam || specialistParam || specialtyParam) {
      setFormData(prev => ({
        ...prev,
        appointment_date: dateParam || prev.appointment_date,
        appointment_time: timeParam || prev.appointment_time,
        specialist_id: specialistParam || prev.specialist_id,
        specialty_id: specialtyParam || prev.specialty_id
      }))
    }
  }, [searchParams])

  // Efecto para cargar slots cuando cambia la fecha o el especialista
  useEffect(() => {
    if (business && formData.appointment_date) {
      loadSlots(formData.appointment_date, formData.specialist_id)
    }
  }, [business, formData.appointment_date, formData.specialist_id])

  const loadSlots = async (date: string, specialistId: string) => {
    try {
      const slots = await getAvailableSlots(business!.id, date, specialistId || undefined)
      setAvailableTimes(slots)
    } catch (error) {
      console.error('Error loading slots:', error)
      setAvailableTimes([])
    }
  }

  const loadBusinessData = async () => {
    try {
      setLoading(true)
      const [businessData, hoursData, specialistsData, specialtiesData] = await Promise.all([
        getBusinessBySlug(slug),
        getBusinessBySlug(slug).then(b => getBusinessHours(b.id)),
        getBusinessBySlug(slug).then(b => getSpecialistsByBusiness(b.id)),
        getBusinessBySlug(slug).then(b => getSpecialtiesByBusiness(b.id)),
      ])

      setBusiness(businessData)
      setHours(hoursData)
      setSpecialists(specialistsData)
      setSpecialties(specialtiesData)

      if (user?.email) {
        setFormData(prev => ({
          ...prev,
          customer_email: user.email || '',
        }))
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      router.push('/reservas')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return

    // Validar con Zod
    const validation = reservaSchema.safeParse({
      customerName: formData.customer_name,
      customerEmail: formData.customer_email,
      customerPhone: formData.customer_phone,
      appointmentDate: formData.appointment_date,
      appointmentTime: formData.appointment_time,
      specialistId: formData.specialist_id || undefined,
      notes: formData.notes || undefined
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      showError(firstError.message)
      return
    }

    try {
      setSubmitting(true)
      await createAppointment({
        business_id: business.id,
        specialist_id: formData.specialist_id || undefined,
        user_id: user?.id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes || undefined,
      })

      router.push('/mis-reservas?success=true')
    } catch (error: any) {
      showError(error.message || 'Error al crear la reserva')
    } finally {
      setSubmitting(false)
    }
  }


  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Establecimiento no encontrado</h2>
          <Link href="/reservas">
            <Button>Volver a Reservas</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PublicHeader backLink={`/${slug}`}>
        <div className="text-center md:text-left text-white">
          <h1 className="text-3xl font-bold mb-2">Completar Reserva</h1>
          <p className="text-blue-100 text-lg">
            Confirma los detalles de tu turno en <span className="font-bold text-white">{business.name}</span>
          </p>
        </div>
      </PublicHeader>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden p-6 md:p-8">

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Resumen de la Selección */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <h3 className="font-bold text-[#003366] mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-[#00A896]" /> Detalles del Turno
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Servicio */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Servicio</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                    <Briefcase size={18} className="text-[#00A896]" />
                    {specialties.find(s => s.id === formData.specialty_id)?.name ||
                      specialists.find(s => s.id === formData.specialist_id)?.specialty || 'Servicio General'}
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                    <Calendar size={18} className="text-[#00A896]" />
                    {formData.appointment_date ? format(new Date(formData.appointment_date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }) : 'Seleccionar fecha'}
                  </div>
                </div>

                {/* Hora */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hora</label>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                    <Clock size={18} className="text-[#00A896]" />
                    {formData.appointment_time || 'Seleccionar hora'}
                  </div>
                </div>

                {/* Especialista (Opcional) */}
                {(formData.specialist_id || specialists.length > 0) && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Especialista</label>
                    {formData.specialist_id ? (
                      <div className="flex items-center gap-2 text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                        <User size={18} className="text-[#00A896]" />
                        {specialists.find(s => s.id === formData.specialist_id)?.name || 'Cualquiera'}
                      </div>
                    ) : (
                      <Select
                        value={formData.specialist_id}
                        onChange={(e) => setFormData({ ...formData, specialist_id: e.target.value })}
                        className="bg-white"
                      >
                        <option value="">Cualquiera</option>
                        {specialists.map((specialist) => (
                          <option key={specialist.id} value={specialist.id}>
                            {specialist.name} {specialist.specialty && `- ${specialist.specialty}`}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-6">
              <h3 className="font-bold text-[#003366] flex items-center gap-2">
                <User size={20} className="text-[#00A896]" /> Tus Datos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="pl-10"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      required
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="pl-10"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      required
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="pl-10"
                      placeholder="+51 987 654 321"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent"
                    placeholder="Mensaje adicional..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Link href={`/${slug}`} className="flex-1">
                <Button type="button" variant="outline" size="lg" className="w-full h-12 text-base">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" size="lg" className="flex-1 h-12 text-base bg-[#00A896] hover:bg-[#008f80]" disabled={submitting}>
                {submitting ? (
                  'Confirmando...'
                ) : (
                  <>
                    Confirmar Reserva
                  </>
                )}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-600">Cargando...</p></div>}>
      <ReservarPageContent />
    </Suspense>
  )
}
