'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/hooks/useConfirm'
import { createClient } from '@/lib/supabase/client'
import { getUserBusinesses } from '@/lib/services/admin'
import { especialidadSchema } from '@/lib/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Power, Menu, X, LogOut, Plus, Trash2, Edit2, ClipboardList, Building2, Star } from 'lucide-react'
import Link from 'next/link'

interface Specialty {
  id: string
  business_id: string
  name: string
  description: string | null
  duration: number
  is_active: boolean
  created_at: string
}

export default function EspecialidadesPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()
  const { success, error: showError } = useToast()
  const { confirm } = useConfirm()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/login')
      return
    }

    if (!loading && !isBusinessOwner) {
      router.push('/reservas')
      return
    }

    if (!loading && isAuthenticated && isBusinessOwner && user) {
      loadData()
    }
  }, [isAuthenticated, isBusinessOwner, loading, user])

  const loadData = async () => {
    try {
      if (!user?.id) return

      const businesses = await getUserBusinesses(user.id)
      if (businesses.length === 0) {
        showError('No tienes un establecimiento asignado')
        return
      }

      const currentBusiness = businesses[0]
      setBusiness(currentBusiness)

      // Cargar especialidades
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name', { ascending: true })

      if (error) throw error
      setSpecialties(data || [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      showError('Error al cargar la información')
    }
  }

  const handleSave = async () => {
    if (!business) {
      showError('No se encontró el negocio')
      return
    }

    // Validar con Zod
    const validation = especialidadSchema.safeParse({
      name: formData.name,
      description: formData.description || undefined,
      duration: formData.duration
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      showError(firstError.message)
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('specialties')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            duration: formData.duration,
          })
          .eq('id', editingId)

        if (error) throw error
        success('Especialidad actualizada exitosamente')
      } else {
        // Crear
        const { error } = await supabase
          .from('specialties')
          .insert({
            business_id: business.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            duration: formData.duration,
            is_active: true,
          })

        if (error) {
          if (error.code === '23505') {
            showError('Ya existe una especialidad con ese nombre')
            return
          }
          throw error
        }
        success('Especialidad creada exitosamente')
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', description: '', duration: 30 })
      loadData()
    } catch (error: any) {
      console.error('Error al guardar especialidad:', error)
      showError(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (specialty: Specialty) => {
    setEditingId(specialty.id)
    setFormData({
      name: specialty.name,
      description: specialty.description || '',
      duration: specialty.duration,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar especialidad?',
      description: 'Esta especialidad será eliminada permanentemente. Los especialistas asociados deberán ser reasignados. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive'
    })
    
    if (!confirmed) return

    try {
      // Verificar si hay especialistas asociados
      const { data: specialists, error: checkError } = await supabase
        .from('specialists')
        .select('id')
        .eq('specialty_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (specialists && specialists.length > 0) {
        showError('No puedes eliminar esta especialidad porque tiene especialistas asociados. Primero elimina o reasigna los especialistas')
        return
      }

      const { error } = await supabase
        .from('specialties')
        .delete()
        .eq('id', id)

      if (error) throw error

      success('Especialidad eliminada exitosamente')
      loadData()
    } catch (error: any) {
      console.error('Error al eliminar especialidad:', error)
      showError(error.message || 'Error al eliminar')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('specialties')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error: any) {
      console.error('Error al cambiar estado:', error)
      showError('Error al cambiar estado')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Cargando establecimiento...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-[#003366]">
              Gestión de Especialidades
            </h2>
          </div>
        </header>

        {/* Formulario */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Especialidad' : 'Nueva Especialidad'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Corte de cabello"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="Descripción de la especialidad..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Duración (minutos) *</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData({ name: '', description: '', duration: 30 })
                }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-6">
            <Plus size={16} className="mr-2" />
            Nueva Especialidad
          </Button>
        )}

        {/* Lista de especialidades */}
        <div className="space-y-4">
          {specialties.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No hay especialidades registradas</p>
              </CardContent>
            </Card>
          ) : (
            specialties.map((specialty) => (
              <Card key={specialty.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-[#003366] text-lg">{specialty.name}</h3>
                        {specialty.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Activa</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Inactiva</span>
                        )}
                      </div>
                      {specialty.description && (
                        <p className="text-sm text-slate-600 mb-2">{specialty.description}</p>
                      )}
                      <p className="text-sm text-slate-500">Duración: {specialty.duration} minutos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(specialty.id, specialty.is_active)}
                      >
                        {specialty.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(specialty)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(specialty.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

