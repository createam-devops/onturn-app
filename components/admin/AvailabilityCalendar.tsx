'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Trash2, Copy, Save } from 'lucide-react'
import type { SpecialistAvailability } from '@/types/specialist'

interface AvailabilitySlot {
  dayOfWeek: number
  startTime: string
  endTime: string
  tempId?: string // Para slots recién creados
}

interface AvailabilityCalendarProps {
  specialistId: string
  specialistName: string
  initialAvailability?: SpecialistAvailability[]
  onSave?: (availability: Omit<SpecialistAvailability, 'id' | 'created_at'>[]) => Promise<void>
}

const DAYS = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
]

// Generar opciones de horarios cada 30 minutos
const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

export default function AvailabilityCalendar({
  specialistId,
  specialistName,
  initialAvailability = [],
  onSave,
}: AvailabilityCalendarProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(
    initialAvailability.map(a => ({
      dayOfWeek: a.day_of_week,
      startTime: a.start_time,
      endTime: a.end_time
    }))
  )
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Agregar nuevo slot
  const addSlot = (dayOfWeek: number) => {
    setSlots([
      ...slots,
      {
        dayOfWeek,
        startTime: '09:00',
        endTime: '10:00',
        tempId: `temp-${Date.now()}`
      }
    ])
  }

  // Eliminar slot
  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  // Actualizar slot
  const updateSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newSlots = [...slots]
    newSlots[index][field] = value
    setSlots(newSlots)
  }

  // Copiar disponibilidad de un día a otro
  const copyDayAvailability = (fromDay: number, toDay: number) => {
    const daySlots = slots.filter(s => s.dayOfWeek === fromDay)
    const newSlots = daySlots.map(s => ({
      ...s,
      dayOfWeek: toDay,
      tempId: `temp-${Date.now()}-${Math.random()}`
    }))
    
    // Eliminar slots existentes del día destino
    const filtered = slots.filter(s => s.dayOfWeek !== toDay)
    setSlots([...filtered, ...newSlots])
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!onSave) return
    
    setSaving(true)
    try {
      const availability = slots.map(s => ({
        specialist_id: specialistId,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        is_available: true
      }))
      
      await onSave(availability)
    } catch (error) {
      console.error('Error al guardar disponibilidad:', error)
    } finally {
      setSaving(false)
    }
  }

  // Obtener slots de un día específico
  const getDaySlots = (dayOfWeek: number) => {
    return slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Disponibilidad Semanal</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {specialistName}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {DAYS.map(day => {
            const daySlots = getDaySlots(day.value)
            
            return (
              <div key={day.value} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{day.label}</h3>
                    {daySlots.length > 0 && (
                      <Badge variant="secondary">
                        {daySlots.length} {daySlots.length === 1 ? 'horario' : 'horarios'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Copiar desde otro día */}
                    {selectedDay !== null && selectedDay !== day.value && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          copyDayAvailability(selectedDay, day.value)
                          setSelectedDay(null)
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <Copy className="h-3 w-3" />
                        Pegar desde {DAYS.find(d => d.value === selectedDay)?.short}
                      </Button>
                    )}
                    
                    {daySlots.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDay(day.value)}
                        className="gap-1.5 text-xs"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(day.value)}
                      className="gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Horario
                    </Button>
                  </div>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Sin horarios configurados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map(({ slot, index }) => (
                      <div
                        key={slot.tempId || `${slot.dayOfWeek}-${index}`}
                        className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        
                        <select
                          value={slot.startTime}
                          onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        
                        <span className="text-gray-500">a</span>
                        
                        <select
                          value={slot.endTime}
                          onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Consejos:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Puedes agregar múltiples horarios por día (ej: mañana y tarde)</li>
            <li>• Usa "Copiar" y "Pegar" para duplicar horarios entre días</li>
            <li>• Los horarios se muestran en bloques de 30 minutos</li>
            <li>• Los cambios se guardan al presionar "Guardar Cambios"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
