'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AvailabilityCalendar from '@/components/admin/AvailabilityCalendar'
import { Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { 
  getSpecialists, 
  getSpecialistAvailability, 
  updateSpecialistAvailability 
} from '@/lib/services/specialists'
import { getUserBusinesses } from '@/lib/services/admin'
import type { Specialist, SpecialistAvailability } from '@/types/specialist'

export default function DisponibilidadPage() {
  const { user } = useAuth()
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null)
  const [availability, setAvailability] = useState<SpecialistAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Cargar especialistas al montar
  useEffect(() => {
    if (user?.id) {
      loadSpecialists()
    }
  }, [user])

  const loadSpecialists = async () => {
    if (!user?.id) {
      setError('No se encontró el usuario')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Obtener el negocio del usuario
      const businesses = await getUserBusinesses(user.id)
      
      if (businesses.length === 0) {
        setError('No tienes un negocio asignado')
        setLoading(false)
        return
      }

      const currentBusiness = businesses[0]
      setBusinessId(currentBusiness.id)
      
      // Cargar especialistas del negocio
      const data = await getSpecialists(currentBusiness.id)
      setSpecialists(data)
      
      // Auto-seleccionar el primer especialista si existe
      if (data.length > 0) {
        selectSpecialist(data[0])
      }
    } catch (err) {
      console.error('Error al cargar especialistas:', err)
      setError('Error al cargar especialistas')
    } finally {
      setLoading(false)
    }
  }

  const selectSpecialist = async (specialist: Specialist) => {
    setSelectedSpecialist(specialist)
    setLoadingAvailability(true)
    
    try {
      const data = await getSpecialistAvailability(specialist.id)
      setAvailability(data)
    } catch (err) {
      console.error('Error al cargar disponibilidad:', err)
      setError('Error al cargar disponibilidad del especialista')
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleSaveAvailability = async (
    newAvailability: Omit<SpecialistAvailability, 'id' | 'created_at'>[]
  ) => {
    if (!selectedSpecialist) return

    try {
      await updateSpecialistAvailability(selectedSpecialist.id, newAvailability)
      
      // Recargar disponibilidad
      const updated = await getSpecialistAvailability(selectedSpecialist.id)
      setAvailability(updated)
      
      alert('✅ Disponibilidad guardada exitosamente')
    } catch (err) {
      console.error('Error al guardar disponibilidad:', err)
      alert('❌ Error al guardar disponibilidad')
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Cargando especialistas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-900">Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (specialists.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-gray-400" />
              <div>
                <CardTitle>Gestión de Disponibilidad</CardTitle>
                <CardDescription>
                  Configura los horarios de atención de tus especialistas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                No tienes especialistas registrados todavía
              </p>
              <Button
                onClick={() => window.location.href = '/admin/especialistas'}
              >
                Ir a Especialistas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Disponibilidad
        </h1>
        <p className="text-gray-600">
          Configura los horarios de atención de tus especialistas
        </p>
      </div>

      {/* Selector de Especialista */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Especialista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specialists.map(specialist => (
              <button
                key={specialist.id}
                onClick={() => selectSpecialist(specialist)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${selectedSpecialist?.id === specialist.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {specialist.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {specialist.specialty_name || 'Sin especialidad'}
                    </p>
                  </div>
                  {selectedSpecialist?.id === specialist.id && (
                    <Badge className="bg-blue-600">
                      Seleccionado
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendario de Disponibilidad */}
      {selectedSpecialist && (
        <>
          {loadingAvailability ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600">
                    Cargando disponibilidad de {selectedSpecialist.full_name}...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AvailabilityCalendar
              specialistId={selectedSpecialist.id}
              specialistName={selectedSpecialist.full_name}
              initialAvailability={availability}
              onSave={handleSaveAvailability}
            />
          )}
        </>
      )}

      {/* Información adicional */}
      <Card className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">
            📋 ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-900">
            <div className="flex gap-3">
              <span className="font-medium min-w-[24px]">1.</span>
              <p>
                <strong>Selecciona un especialista</strong> para configurar su disponibilidad semanal
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-medium min-w-[24px]">2.</span>
              <p>
                <strong>Agrega horarios</strong> para cada día de la semana (puedes tener múltiples bloques por día)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-medium min-w-[24px]">3.</span>
              <p>
                <strong>Copia horarios</strong> entre días para agilizar la configuración
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-medium min-w-[24px]">4.</span>
              <p>
                <strong>Guarda los cambios</strong> y los horarios estarán disponibles para reservas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
