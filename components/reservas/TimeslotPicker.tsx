'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { getAvailableSlots } from '@/lib/services/appointments'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TimeslotPickerProps {
  businessId: string
  specialistId?: string
  selectedDate: string // YYYY-MM-DD format
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  className?: string
}

export default function TimeslotPicker({
  businessId,
  specialistId,
  selectedDate,
  selectedTime,
  onTimeSelect,
  className = ''
}: TimeslotPickerProps) {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate && businessId) {
      loadSlots()
    }
  }, [selectedDate, specialistId, businessId])

  const loadSlots = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const availableSlots = await getAvailableSlots(
        businessId,
        selectedDate,
        specialistId
      )
      
      setSlots(availableSlots)

      // Si el slot previamente seleccionado ya no está disponible, limpiarlo
      if (selectedTime && !availableSlots.includes(selectedTime)) {
        onTimeSelect('')
      }
    } catch (err) {
      console.error('Error al cargar horarios:', err)
      setError('Error al cargar horarios disponibles')
    } finally {
      setLoading(false)
    }
  }

  // Agrupar slots por periodo del día
  const groupSlotsByPeriod = () => {
    if (slots.length === 0) return { morning: [], afternoon: [], evening: [] }

    return slots.reduce((groups, slot) => {
      const hour = parseInt(slot.split(':')[0])
      
      if (hour < 12) {
        groups.morning.push(slot)
      } else if (hour < 18) {
        groups.afternoon.push(slot)
      } else {
        groups.evening.push(slot)
      }
      
      return groups
    }, { morning: [] as string[], afternoon: [] as string[], evening: [] as string[] })
  }

  const groupedSlots = groupSlotsByPeriod()

  // Formatear la fecha seleccionada para mostrar
  const formattedDate = selectedDate 
    ? format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })
    : ''

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <p className="text-gray-600">Cargando horarios disponibles...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </Card>
    )
  }

  if (!selectedDate) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mb-3 opacity-30" />
          <p>Selecciona una fecha para ver horarios disponibles</p>
        </div>
      </Card>
    )
  }

  if (slots.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-center">
            No hay horarios disponibles para <br />
            <span className="font-medium text-gray-700 capitalize">{formattedDate}</span>
          </p>
          <p className="text-sm mt-2">Intenta seleccionar otra fecha</p>
        </div>
      </Card>
    )
  }

  const renderSlotGroup = (title: string, slots: string[]) => {
    if (slots.length === 0) return null

    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          {title}
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map(slot => {
            const isSelected = selectedTime === slot
            
            return (
              <button
                key={slot}
                onClick={() => onTimeSelect(slot)}
                className={`
                  px-3 py-2.5 rounded-lg font-medium text-sm transition-all
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200'
                  }
                `}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Horarios Disponibles
          </h3>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {slots.length} {slots.length === 1 ? 'horario' : 'horarios'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 capitalize">{formattedDate}</p>
      </div>

      {/* Slots agrupados por periodo */}
      <div>
        {renderSlotGroup('Mañana', groupedSlots.morning)}
        {renderSlotGroup('Tarde', groupedSlots.afternoon)}
        {renderSlotGroup('Noche', groupedSlots.evening)}
      </div>

      {/* Slot seleccionado */}
      {selectedTime && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Horario seleccionado</p>
              <p className="text-lg font-bold">{selectedTime}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
