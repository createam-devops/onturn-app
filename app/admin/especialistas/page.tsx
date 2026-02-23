'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/hooks/useConfirm'
import { createClient } from '@/lib/supabase/client'
import { getUserBusinesses } from '@/lib/services/admin'
import { especialistaSchema } from '@/lib/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { ImageUpload } from '@/components/shared/ImageUpload' // Disabled - avatar column doesn't exist
import { Power, Menu, X, LogOut, Plus, Trash2, Edit2, ClipboardList, Star, Users, User, Settings, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errorHandler'

interface Specialist {
  id: string
  business_id: string
  specialty_id: string | null
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  is_active: boolean
  created_at: string
  specialty?: {
    name: string
  }
}

interface Specialty {
  id: string
  name: string
  color?: string // Added for UI compatibility
}

export default function EspecialistasPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()
  const { success, error: showError } = useToast()
  const { confirm } = useConfirm()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Data loading state
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty_id: '',
    // avatar: '', // Temporarily disabled - column doesn't exist in Supabase
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Si useAuth dice que no hay usuario, redirigir
    if (!loading && !isAuthenticated) {
      router.push('/admin/login')
      return
    }

    // Si hay usuario pero no es owner, redirigir
    if (!loading && isAuthenticated && !isBusinessOwner) {
      router.push('/reservas')
      return
    }

    // Cargar datos solo si todo está ok
    if (!loading && isAuthenticated && isBusinessOwner && user) {
      loadData()
    }
  }, [isAuthenticated, isBusinessOwner, loading, user, router])

  const loadData = async () => {
    try {
      if (!user?.id) return
      setLoadingData(true)

      // Timeout safety
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_DATA_LOAD')), 8000)
      )

      const businessesPromise = getUserBusinesses(user.id)
      const businesses = await Promise.race([businessesPromise, timeoutPromise]) as any[]

      if (businesses.length === 0) {
        showError('No tienes un establecimiento asignado.')
        return
      }

      const currentBusiness = businesses[0]
      setBusiness(currentBusiness)

      // Cargar especialistas
      const { data: specialistsData, error: specialistsError } = await supabase
        .from('specialists')
        .select(`
          *,
          specialty:specialties(name)
        `)
        .eq('business_id', currentBusiness.id)
        .order('name', { ascending: true })

      if (specialistsError) throw specialistsError
      setSpecialists(specialistsData || [])

      // Cargar especialidades
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('specialties')
        .select('id, name')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (specialtiesError) throw specialtiesError
      // Add random colors for UI demo if needed, or just map
      setSpecialties(specialtiesData?.map(s => ({ ...s, color: 'blue' })) || [])

    } catch (error) {
      const errorMessage = getErrorMessage(error, 'LOAD_ESPECIALISTAS_DATA')
      console.error('[ESPECIALISTAS] Error al cargar datos:', errorMessage)
      showError(errorMessage)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = async () => {
    if (!business || !formData.name.trim()) {
      showError('Por favor ingresa un nombre válido')
      return
    }

    if (!formData.specialty_id) {
      showError('Por favor selecciona una especialidad')
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('specialists')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            specialty_id: formData.specialty_id || null,
            // avatar: formData.avatar.trim() || null, // Disabled - column doesn't exist
          })
          .eq('id', editingId)

        if (error) throw error
        success('Especialista actualizado exitosamente')
      } else {
        // Verificar límite de especialistas según el plan
        const maxAllowed = business.max_specialists || 1
        const currentCount = specialists.length
        
        if (currentCount >= maxAllowed) {
          showError(
            `Límite alcanzado: Tu plan ${business.plan_type?.toUpperCase() || 'FREE'} permite ${maxAllowed} especialista(s). ` +
            `Actualiza tu plan para agregar más especialistas.`
          )
          setSaving(false)
          return
        }

        // Si el negocio no está aprobado, también verificar
        if (business.approval_status === 'pending') {
          showError(
            'Tu negocio aún está pendiente de aprobación. ' +
            'Una vez aprobado, podrás agregar más especialistas según tu plan.'
          )
          setSaving(false)
          return
        }

        // Crear
        const { error } = await supabase
          .from('specialists')
          .insert({
            business_id: business.id,
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            specialty_id: formData.specialty_id || null,
            // avatar: formData.avatar.trim() || null, // Disabled - column doesn't exist
            is_active: true,
          })

        if (error) throw error
        success('Especialista creado exitosamente')
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', email: '', phone: '', specialty_id: '' })
      loadData()
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'SAVE_SPECIALIST')
      console.error('[ESPECIALISTAS] Error al guardar:', errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (specialist: Specialist) => {
    setEditingId(specialist.id)
    setFormData({
      name: specialist.name,
      email: specialist.email || '',
      phone: specialist.phone || '',
      specialty_id: specialist.specialty_id || '',
      // avatar: specialist.avatar || '', // Disabled
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar especialista?',
      description: 'Esta acción no se puede deshacer. El especialista será eliminado permanentemente del sistema.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive'
    })
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('specialists')
        .delete()
        .eq('id', id)

      if (error) throw error

      success('Especialista eliminado exitosamente')
      loadData()
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'DELETE_SPECIALIST')
      console.error('[ESPECIALISTAS] Error al eliminar:', errorMessage)
      showError(errorMessage)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('specialists')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error: any) {
      console.error('Error al cambiar estado:', error)
      showError('Error al cambiar estado')
    }
  }

  // Badge Component inline for simplicity
  const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: string }) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-50 text-[#003366] border-blue-100",
      green: "bg-green-50 text-green-700 border-green-100",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
      slate: "bg-slate-100 text-slate-600 border-slate-200",
      red: "bg-red-50 text-red-700 border-red-200"
    };
    return <span className={`px-2 py-1 rounded-md text-xs font-bold border ${colors[color] || colors.blue} whitespace-nowrap`}>{children}</span>;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mx-auto"></div>
          <p className="text-slate-600 font-medium text-lg">Cargando equipo...</p>
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
              Especialistas
            </h2>
          </div>
        </header>

        <div className="space-y-6 max-w-5xl animate-in fade-in">

          {/* Formulario Overlay o Inline */}
          {showForm && (
            <Card className="mb-6 border border-slate-200 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50 border-b border-slate-100 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-[#003366]">
                  {editingId ? 'Editar Especialista' : 'Nuevo Especialista'}
                </CardTitle>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Dr. Juan Pérez"
                    className="bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Especialidad *</label>
                  <select
                    value={formData.specialty_id}
                    onChange={(e) => setFormData({ ...formData, specialty_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] bg-slate-50"
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {specialties.map((spec) => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+51 999 999 999"
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
                {/* Avatar field temporarily disabled - column doesn't exist in Supabase
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Avatar</label>
                  <ImageUpload
                    currentImageUrl={formData.avatar}
                    onImageUploaded={(url) => {
                      setFormData({ ...formData, avatar: url })
                      success('Avatar subido exitosamente')
                    }}
                    bucket="avatars"
                    folder={editingId || 'temp'}
                    maxSizeInMB={2}
                    previewSize="sm"
                    shape="circle"
                    buttonText="Subir avatar"
                    compressionType="avatar"
                  />
                </div>
                */}
                <div className="flex gap-3 pt-4 justify-end">
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button variant="default" className="bg-[#003366] hover:bg-[#002244]" onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Especialista'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header de la Lista */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#003366] flex items-center gap-2">
                <Users size={20} className="text-[#00A896]" /> Listado de Especialistas
              </h3>
              <p className="text-sm text-slate-500">Gestiona al personal que atiende en tu negocio</p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="bg-[#00A896] hover:bg-[#008f7f] text-white" disabled={specialties.length === 0}>
                <Plus size={18} className="mr-2" />
                Nuevo
              </Button>
            )}
          </div>

          {specialties.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <Star className="text-yellow-600 mt-1 shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-yellow-800">Faltan Especialidades</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Antes de crear especialistas, necesitas definir qué servicios o especialidades ofrece tu negocio (ej. 'Cardiología', 'Corte de Pelo', 'Cancha de Tenis').
                </p>
                <Button size="sm" variant="outline" className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100" onClick={() => router.push('/admin/configuracion')}>
                  Ir a Configuración
                </Button>
              </div>
            </div>
          )}

          {/* Lista de especialistas estilizada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialists.length === 0 && specialties.length > 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <Users size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay especialistas registrados aún.</p>
                <Button variant="ghost" onClick={() => setShowForm(true)} className="text-[#00A896]">Crear el primero</Button>
              </div>
            ) : (
              specialists.map((specialist) => (
                <div key={specialist.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#003366] rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {specialist.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{specialist.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{specialist.email || 'Sin email'}</p>
                      </div>
                    </div>
                    <Badge color={specialist.is_active ? 'green' : 'red'}>
                      {specialist.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Especialidad</span>
                      <span className="font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded">{specialist.specialty?.name}</span>
                    </div>
                    {specialist.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Teléfono</span>
                        <span className="text-slate-700">{specialist.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs hover:bg-slate-50 text-slate-600" onClick={() => handleEdit(specialist)}>
                      <Edit2 size={14} className="mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className={`flex-1 h-8 text-xs hover:bg-slate-50 ${specialist.is_active ? 'text-orange-600' : 'text-green-600'}`} onClick={() => handleToggleActive(specialist.id, specialist.is_active)}>
                      <Power size={14} className="mr-1" /> {specialist.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(specialist.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

