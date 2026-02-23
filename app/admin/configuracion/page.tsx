'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { getUserBusinesses } from '@/lib/services/admin'
import { businessConfigSchema, businessHoursSchema } from '@/lib/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { Building, Clock, MapPin, Power, Menu, X, LogOut, Save, User, Settings, CheckCircle, AlertCircle, Building2, Star } from 'lucide-react'
import Link from 'next/link'
import type { Business, BusinessHours } from '@/types/business'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export default function ConfiguracionPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()
  const [business, setBusiness] = useState<Business | null>(null)
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Formulario
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [slotDuration, setSlotDuration] = useState('30')
  const [hours, setHours] = useState<Record<number, { open: string; close: string; closed: boolean }>>({})

  useEffect(() => {
    // Si useAuth dice que no hay usuario, redirigir
    if (!loading && !isAuthenticated) {
      router.push('/admin/login')
      return
    }

    // Si hay usuario pero no es owner, redirigir
    if (!loading && isAuthenticated && !isBusinessOwner) {
      console.log('[CONFIG] Usuario no es business_owner, redirigiendo...')
      router.push('/reservas')
      return
    }

    // Cargar datos solo si todo está ok
    if (!loading && isAuthenticated && isBusinessOwner && user) {
      loadBusiness()
    }
  }, [isAuthenticated, isBusinessOwner, loading, user, router])

  const loadBusiness = async () => {
    try {
      if (!user?.id) return

      const businesses = await getUserBusinesses(user.id)
      if (businesses.length === 0) {
        showError('No tienes un establecimiento asignado', 'Contacta al administrador.')
        return
      }

      const currentBusiness = businesses[0]
      setBusiness(currentBusiness)
      setName(currentBusiness.name || '')
      setDescription(currentBusiness.description || '')
      setAddress(currentBusiness.address || '')
      setCity(currentBusiness.city || '')
      setPhone(currentBusiness.phone || '')
      setEmail(currentBusiness.email || '')
      setWebsite(currentBusiness.website || '')

      // Cargar horarios
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('day_of_week', { ascending: true })

      if (hoursError) throw hoursError

      const hoursMap: Record<number, { open: string; close: string; closed: boolean }> = {}
      DAYS_OF_WEEK.forEach(day => {
        const dayHours = hoursData?.find(h => h.day_of_week === day.value)
        hoursMap[day.value] = {
          open: dayHours?.open_time || '09:00',
          close: dayHours?.close_time || '18:00',
          closed: dayHours?.is_closed || false,
        }
      })
      setHours(hoursMap)
      setBusinessHours(hoursData || [])

      // Cargar configuracion (settings) - opcional ya que la tabla puede no existir
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('business_settings')
          .select('slot_duration')
          .eq('business_id', currentBusiness.id)
          .maybeSingle()

        if (!settingsError && settingsData) {
          setSlotDuration(settingsData.slot_duration?.toString() || '30')
        }
      } catch (err) {
        console.warn('business_settings table not available, using defaults')
      }
    } catch (error) {
      console.error('Error al cargar establecimiento:', error)
      showError('Error al cargar la información del establecimiento')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = async () => {
    if (!business) return

    // Validar datos básicos con Zod
    const validation = businessConfigSchema.safeParse({
      name,
      description: description || undefined,
      address: address || undefined,
      city: city || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      showError(firstError.message)
      return
    }

    try {
      setSaving(true)

      // Actualizar datos básicos
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          name,
          description,
          address,
          city,
          phone,
          email,
          website,
        })
        .eq('id', business.id)

      if (updateError) throw updateError

      // Actualizar horarios
      for (const day of DAYS_OF_WEEK) {
        const dayHours = hours[day.value]
        if (!dayHours) continue

        const existingHours = businessHours.find(h => h.day_of_week === day.value)

        if (existingHours) {
          // Actualizar
          const { error } = await supabase
            .from('business_hours')
            .update({
              open_time: dayHours.open,
              close_time: dayHours.close,
              is_closed: dayHours.closed,
            })
            .eq('id', existingHours.id)

          if (error) throw error
        } else {
          // Crear
          const { error } = await supabase
            .from('business_hours')
            .insert({
              business_id: business.id,
              day_of_week: day.value,
              open_time: dayHours.open,
              close_time: dayHours.close,
              is_closed: dayHours.closed,
            })

          if (error) throw error
        }
      }

      // 4. Actualizar/Crear Configuración (Slot Duration) - opcional
      try {
        const { data: existingSettings } = await supabase
          .from('business_settings')
          .select('id')
          .eq('business_id', business.id)
          .maybeSingle()

        if (existingSettings) {
          const { error } = await supabase
            .from('business_settings')
            .update({ slot_duration: parseInt(slotDuration) })
            .eq('business_id', business.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('business_settings')
            .insert({
              business_id: business.id,
              slot_duration: parseInt(slotDuration),
              advance_booking_days: 30, // Defaults
              reminder_hours: 24
            })
          if (error) throw error
        }
      } catch (settingsError) {
        console.warn('business_settings not available, skipping:', settingsError)
      }

      success('Configuración guardada exitosamente')
      loadBusiness()
    } catch (error: any) {
      console.error('Error al guardar configuración:', error)
      showError('Error al guardar', error.message || 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const updateDayHours = (day: number, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  // Renderizado condicional
  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mx-auto"></div>
          <p className="text-slate-600 font-medium text-lg">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-[#003366] capitalize">
              Configuración
            </h2>
          </div>
        </header>

        <div className="space-y-6 max-w-4xl animate-in fade-in">

          {/* Card: Logo */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-[#003366] text-lg font-bold">
                <Building2 size={20} className="text-[#00A896]" /> Logo del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <ImageUpload
                currentImageUrl={business?.logo_url}
                onImageUploaded={async (url) => {
                  if (!business) return
                  const { error } = await supabase
                    .from('businesses')
                    .update({ logo_url: url })
                    .eq('id', business.id)
                  
                  if (!error) {
                    setBusiness({ ...business, logo_url: url })
                    success('Logo actualizado exitosamente')
                  } else {
                    showError('Error al actualizar el logo')
                  }
                }}
                bucket="business-logos"
                folder={business?.id}
                maxSizeInMB={3}
                previewSize="lg"
                buttonText="Cambiar logo"
                compressionType="logo"
              />
            </CardContent>
          </Card>

          {/* Card: Datos */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-[#003366] text-lg font-bold">
                <Building size={20} className="text-[#00A896]" /> Datos del Establecimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5 bg-white">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Negocio</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-[#003366]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Sitio Web</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción (Visible en App)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003366] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Horarios */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-[#003366] text-lg font-bold">
                <Clock size={20} className="text-[#00A896]" /> Horarios de Atención
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              {DAYS_OF_WEEK.map((day) => {
                const dayHours = hours[day.value]
                if (!dayHours) return null

                return (
                  <div key={day.value} className="flex flex-col sm:flex-row items-center gap-4 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                    <div className="w-40 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!dayHours.closed}
                        onChange={(e) => updateDayHours(day.value, 'closed', !e.target.checked)}
                        className="w-5 h-5 accent-[#00A896] cursor-pointer"
                      />
                      <span className={`font-bold ${dayHours.closed ? 'text-slate-400' : 'text-slate-700'}`}>{day.label}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => updateDayHours(day.value, 'open', e.target.value)}
                        disabled={dayHours.closed}
                        className={`p-2 border border-slate-200 rounded-lg w-32 ${dayHours.closed ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'}`}
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => updateDayHours(day.value, 'close', e.target.value)}
                        disabled={dayHours.closed}
                        className={`p-2 border border-slate-200 rounded-lg w-32 ${dayHours.closed ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'}`}
                      />
                      {dayHours.closed && <span className="text-xs text-slate-400 font-bold uppercase ml-2">Cerrado</span>}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 pb-10">
            <Button onClick={handleSave} disabled={saving} className="bg-[#003366] text-white hover:bg-[#002244] px-8 py-3 h-auto text-lg rounded-xl shadow-lg shadow-blue-900/20 transition-all">
              <Save size={20} className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

