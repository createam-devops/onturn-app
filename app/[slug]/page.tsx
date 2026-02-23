'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getBusinessBySlug, getBusinessHours } from '@/lib/services/businesses'
import { getSpecialistsByBusiness } from '@/lib/services/specialists'
import { getSpecialtiesByBusiness, type Specialty } from '@/lib/services/specialties'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MapPin, Clock, CheckCircle, Star,
  Briefcase, User, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import type { Business, BusinessHours } from '@/types/business'
import type { Specialist } from '@/types/specialist'
import { PublicHeader } from '@/components/public/PublicHeader'
import TimeslotPicker from '@/components/reservas/TimeslotPicker'
import { Skeleton } from '@/components/ui/skeleton'
import ReviewList from '@/components/reviews/ReviewList'
import ReviewModal from '@/components/reviews/ReviewModal'

export default function BusinessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { isAuthenticated } = useAuth()

  const [business, setBusiness] = useState<Business | null>(null)
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewListKey, setReviewListKey] = useState(0)

  // Generar próximos 14 días
  const nextDays = useMemo(() => {
    const days = []
    const today = new Date()
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      days.push({
        label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : daysOfWeek[d.getDay()],
        number: d.getDate(),
        fullDate: d,
        dateString: format(d, 'yyyy-MM-dd')
      })
    }
    return days
  }, [])

  useEffect(() => {
    if (slug) {
      loadBusinessData()
    }
  }, [slug])

  const loadBusinessData = async () => {
    try {
      setLoading(true)
      // 1. Fetch Business First (Single Source of Truth for ID)
      const businessData = await getBusinessBySlug(slug)
      setBusiness(businessData)

      if (businessData?.id) {
        // 2. Fetch dependencies in parallel using the ID
        const [hoursData, specialistsData, specialtiesData] = await Promise.all([
          getBusinessHours(businessData.id).catch(() => []),
          getSpecialistsByBusiness(businessData.id).catch(() => []),
          getSpecialtiesByBusiness(businessData.id).catch(() => []),
        ])

        setHours(hoursData)
        setSpecialists(specialistsData)
        setSpecialties(specialtiesData)

        if (specialtiesData?.length > 0) {
          setSelectedSpecialty(specialtiesData[0].id)
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      router.push('/reservas')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async (date: string) => {
    if (!business) return

    try {
      setSlotsLoading(true)
      setAvailableSlots([]) // Clear previous slots

      // Find specialists for the selected specialty
      let targetSpecialistId: string | undefined = undefined;

      if (selectedSpecialty) {
        const specialistForSpecialty = specialists.find((s: any) => s.specialty_id === selectedSpecialty)
        if (specialistForSpecialty) {
          targetSpecialistId = specialistForSpecialty.id
        }
      }

      const slots = await getAvailableSlots(business.id, date, targetSpecialistId)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Error al cargar slots:', error)
      setAvailableSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleBookSlot = (slot: string) => {
    if (!business) return
    
    let specialistParam = ''
    let specialtyParam = ''

    if (selectedSpecialty) {
      specialtyParam = `&specialty=${selectedSpecialty}`

      const specialistForSpecialty = specialists.find((s: any) => s.specialty_id === selectedSpecialty)
      if (specialistForSpecialty) {
        specialistParam = `&specialist=${specialistForSpecialty.id}`
      }
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=/${slug}/reservar&date=${nextDays[selectedDateIndex].dateString}&time=${slot}${specialistParam}${specialtyParam}`)
      return
    }
    router.push(`/${slug}/reservar?date=${nextDays[selectedDateIndex].dateString}&time=${slot}${specialistParam}${specialtyParam}`)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    handleBookSlot(time)
  }

  const getCurrentHours = () => {
    const selectedDay = nextDays[selectedDateIndex]
    const dayOfWeek = selectedDay.fullDate.getDay()
    const dayHours = hours.find(h => h.day_of_week === dayOfWeek)

    if (!dayHours || dayHours.is_closed) {
      return 'Cerrado'
    }
    return `${dayHours.open_time} - ${dayHours.close_time}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header Skeleton */}
        <div className="relative h-[260px] md:h-[340px] bg-slate-200">
          <div className="absolute inset-0 bg-slate-300 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <Skeleton className="h-10 md:h-16 w-3/4 max-w-lg mb-4 bg-slate-400/50" />
              <div className="flex gap-4">
                <Skeleton className="h-6 w-32 bg-slate-400/30" />
                <Skeleton className="h-6 w-24 bg-slate-400/30" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column Skeleton */}
            <div className="md:col-span-2 space-y-8 bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
              <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="flex gap-3 overflow-hidden mb-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-20 w-[4.5rem] rounded-2xl shrink-0" />
                  ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                <Skeleton className="h-6 w-32 mb-6" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200/50 last:border-0">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-10 w-full mt-6 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-lg p-8">
          <p className="text-slate-600 mb-4">Establecimiento no encontrado</p>
          <Link href="/reservas">
            <Button>Volver a Reservas</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PublicHeader
        backLink="/reservas"
        bgImage={business.images?.[0] || business.logo || undefined}
        className="min-h-[260px] md:min-h-[340px]"
      >
        <div className="text-white mt-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight leading-tight drop-shadow-lg">{business.name}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-blue-100 text-sm md:text-base font-medium">
            <span className="flex items-center gap-1.5 drop-shadow-md">
              <MapPin size={18} className="text-[#00A896]" />
              {business.address || `${business.city}${business.state ? `, ${business.state}` : ''}`}
            </span>
            {business.rating && (
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-sm">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                {business.rating}
                {business.total_reviews && (
                  <span className="opacity-70 text-xs">({business.total_reviews} reseñas)</span>
                )}
              </span>
            )}
          </div>
        </div>
      </PublicHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-8">

        {/* Grid de Detalles y Slots */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Columna Izquierda: Servicios y Slots */}
          <div className="md:col-span-2 space-y-8 bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                <Briefcase size={22} className="text-[#00A896]" /> Selecciona Especialidad
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {specialties.length > 0 ? (
                  <>
                    {specialties.map((specialty) => {
                      // Find a specialist for this specialty to show name
                      const specialist = specialists.find((s: any) => s.specialty_id === specialty.id);

                      return (
                        <button
                          key={specialty.id}
                          onClick={() => setSelectedSpecialty(
                            specialty.id
                          )}
                          className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                ${selectedSpecialty === specialty.id
                              ? 'border-[#00A896] bg-teal-50 text-[#003366]'
                              : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'}`}
                        >
                          <div className="font-bold text-sm truncate pr-4" title={specialty.name}>
                            {specialty.name}
                          </div>
                          {specialist && (
                            <div className="text-xs opacity-70 mt-0.5 truncate flex items-center gap-1">
                              <User size={10} />
                              {specialist.name}
                            </div>
                          )}
                          {selectedSpecialty === specialty.id && (
                            <div className="absolute top-2 right-2 text-[#00A896]">
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </>
                ) : (
                  /* Fallback if no specialties found, try showing specialists or general */
                  specialists.length > 0 ? (
                    specialists.map((specialist) => (
                      <div key={specialist.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="font-bold text-sm">{specialist.specialty || 'Servicio'}</div>
                        <div className="text-xs text-slate-500">{specialist.name}</div>
                      </div>
                    ))
                  ) : (
                    <span className="col-span-full px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-bold border border-slate-200 text-sm md:text-base">
                      Servicios generales
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-end mb-5">
                <h3 className="text-xl font-bold text-[#003366] flex items-center gap-2">
                  <Clock size={22} className="text-[#00A896]" /> Selecciona Fecha y Hora
                </h3>
              </div>

              {/* Date Picker Horizontal */}
              <div className="flex gap-3 overflow-x-auto pb-4 mb-6 no-scrollbar">
                {nextDays.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDateIndex(i)
                      setSelectedTime(null) // Reset selected time when changing date
                    }}
                    className={`flex flex-col items-center justify-center min-w-[4.5rem] py-3 rounded-2xl border transition-all duration-300
                      ${selectedDateIndex === i
                        ? 'bg-[#003366] text-white border-[#003366] shadow-lg transform scale-105'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-[#00A896] hover:text-[#00A896]'}`}
                  >
                    <span className="text-[10px] font-bold uppercase mb-1 tracking-wider opacity-80">{day.label}</span>
                    <span className="text-xl font-extrabold">{day.number}</span>
                  </button>
                ))}
              </div>

              {/* Timeslot Picker Component */}
              {business && (
                <TimeslotPicker
                  businessId={business.id}
                  specialistId={selectedSpecialty ? specialists.find((s: any) => s.specialty_id === selectedSpecialty)?.id : undefined}
                  selectedDate={nextDays[selectedDateIndex].dateString}
                  selectedTime={selectedTime}
                  onTimeSelect={handleTimeSelect}
                />
              )}

              {!isAuthenticated && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-blue-800 font-medium">
                    Selecciona un horario para iniciar sesión y confirmar tu reserva automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Resumen */}
          <div className="space-y-4">
            <Card className="bg-slate-50 border-slate-200 sticky top-8 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#003366] text-lg font-bold">Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-200/50 gap-4">
                  <span className="text-slate-500 text-sm font-medium">Estado</span>
                  <span className="text-[#00A896] font-bold text-sm flex items-center gap-1.5 text-right">
                    <CheckCircle size={16} /> Abierto Ahora
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-200/50 gap-4">
                  <span className="text-slate-500 text-sm font-medium">Horario {nextDays[selectedDateIndex]?.label}</span>
                  <span className="text-[#003366] font-bold text-sm text-right">{getCurrentHours()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-200/50 gap-4">
                  <span className="text-slate-500 text-sm font-medium">Categoría</span>
                  <span className="text-slate-700 font-bold text-sm capitalize px-2 py-1 bg-white rounded border border-slate-200 text-right">
                    {business.category?.name || 'General'}
                  </span>
                </div>
                {business.phone && (
                  <div className="flex justify-between items-center py-3 border-b border-slate-200/50 gap-4">
                    <span className="text-slate-500 text-sm font-medium">Teléfono</span>
                    <a href={`tel:${business.phone}`} className="text-[#00A896] font-bold text-sm text-right hover:underline">
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div className="flex justify-between items-center py-3 border-b border-slate-200/50 gap-4">
                    <span className="text-slate-500 text-sm font-medium">Email</span>
                    <a href={`mailto:${business.email}`} className="text-[#00A896] font-bold text-sm text-right hover:underline truncate">
                      {business.email}
                    </a>
                  </div>
                )}

                <div className="mt-6 pt-2">
                  <Button fullWidth variant="secondary" size="sm" icon={MapPin}>Ver en Mapa</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección de Reviews */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-[#003366]">
              Opiniones de Clientes
            </h3>
            {isAuthenticated && (
              <Button
                onClick={() => setIsReviewModalOpen(true)}
                variant="primary"
                size="sm"
              >
                Dejar Opinión
              </Button>
            )}
          </div>
          <ReviewList key={reviewListKey} businessId={business.id} />
        </div>

        {/* Review Modal */}
        <ReviewModal
          businessId={business.id}
          businessName={business.name}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={() => {
            setReviewListKey(prev => prev + 1) // Force refresh
            setIsReviewModalOpen(false)
          }}
        />
      </div>
    </div>
  )
}
