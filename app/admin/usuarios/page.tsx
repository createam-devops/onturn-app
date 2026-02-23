'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/hooks/useConfirm'
import { createClient } from '@/lib/supabase/client'
import { getUserBusinesses } from '@/lib/services/admin'
import { tenantUserSchema } from '@/lib/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Power, Menu, X, LogOut, Plus, Trash2, ClipboardList, Building2 } from 'lucide-react'
import Link from 'next/link'

interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'specialist' | 'business_owner'
  specialty_id: string | null
  is_active: boolean
  user?: {
    email: string
    full_name: string
  }
  specialty?: {
    name: string
  }
}

interface Specialty {
  id: string
  name: string
}

export default function UsuariosPage() {
  const router = useRouter()
  const { isAuthenticated, isBusinessOwner, loading, user } = useAuth()
  const { success, error: showError } = useToast()
  const { confirm } = useConfirm()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [maxUsers, setMaxUsers] = useState(5)
  const [currentUsers, setCurrentUsers] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<'specialist' | 'business_owner'>('specialist')
  const [newUserSpecialtyId, setNewUserSpecialtyId] = useState('')
  const [addingUser, setAddingUser] = useState(false)

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
      setMaxUsers(currentBusiness.max_users || 5)

      // Cargar usuarios del tenant
      const { data: rawUsersData, error: usersError } = await supabase
        .from('tenant_users')
        .select(`
          *,
          specialty:specialties(name)
        `)
        .eq('tenant_id', currentBusiness.id)

      if (usersError) throw usersError

      // Fetch profiles manually to avoid foreign key issues with auth.users
      let finalUsers = []
      if (rawUsersData && rawUsersData.length > 0) {
        const userIds = rawUsersData.map(u => u.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])

        finalUsers = rawUsersData.map(tu => ({
          ...tu,
          user: profilesMap.get(tu.user_id)
        }))
      }

      setTenantUsers(finalUsers)
      setCurrentUsers(finalUsers.length)

      // Cargar especialidades
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('specialties')
        .select('id, name')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true)

      if (specialtiesError) throw specialtiesError
      setSpecialties(specialtiesData || [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      showError('Error al cargar la información')
    }
  }

  const handleAddUser = async () => {
    if (!business) {
      showError('No se encontró el negocio')
      return
    }

    if (currentUsers >= maxUsers) {
      showError(`Has alcanzado el límite de ${maxUsers} usuarios. Contacta al administrador para aumentar el límite`)
      return
    }

    // Validar con Zod
    const validation = tenantUserSchema.safeParse({
      email: newUserEmail,
      role: newUserRole,
      specialtyId: newUserRole === 'specialist' ? newUserSpecialtyId : undefined
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      showError(firstError.message)
      return
    }

    try {
      setAddingUser(true)

      // Buscar usuario por email
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newUserEmail)
        .single()

      if (profilesError || !profilesData) {
        showError('Usuario no encontrado. El usuario debe estar registrado primero')
        return
      }

      // Verificar que no esté ya agregado
      const existing = tenantUsers.find(tu => tu.user_id === profilesData.id)
      if (existing) {
        showError('Este usuario ya está agregado al tenant')
        return
      }

      // Agregar usuario al tenant
      const { error: insertError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: business.id,
          user_id: profilesData.id,
          role: newUserRole,
          specialty_id: newUserRole === 'specialist' ? newUserSpecialtyId : null,
          is_active: true,
        })

      if (insertError) throw insertError

      // Actualizar rol del usuario si es especialista
      if (newUserRole === 'specialist') {
        await supabase
          .from('profiles')
          .update({ role: 'specialist' })
          .eq('id', profilesData.id)
      }

      success('Usuario agregado exitosamente')
      setNewUserEmail('')
      setNewUserSpecialtyId('')
      setShowAddForm(false)
      loadData()
    } catch (error: any) {
      console.error('Error al agregar usuario:', error)
      showError(error.message || 'Error al agregar usuario')
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar usuario?',
      description: 'Este usuario perderá acceso al establecimiento. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive'
    })
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('tenant_users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      success('Usuario eliminado exitosamente')
      loadData()
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error)
      showError(error.message ||'Error al eliminar usuario')
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
              Gestión de Usuarios
            </h2>
          </div>
        </header>

        {/* Información de límite */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Usuarios actuales</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {currentUsers} / {maxUsers}
                </p>
              </div>
              {currentUsers >= maxUsers && (
                <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm">
                  Límite alcanzado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulario para agregar usuario */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Agregar Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email del Usuario</label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
                <p className="text-xs text-slate-500 mt-1">El usuario debe estar registrado previamente</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Rol</label>
                <select
                  value={newUserRole}
                  onChange={(e) => {
                    setNewUserRole(e.target.value as 'specialist' | 'business_owner')
                    if (e.target.value !== 'specialist') {
                      setNewUserSpecialtyId('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="specialist">Especialista</option>
                  <option value="business_owner">Admin del Tenant</option>
                </select>
              </div>
              {newUserRole === 'specialist' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Especialidad</label>
                  <select
                    value={newUserSpecialtyId}
                    onChange={(e) => setNewUserSpecialtyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  >
                    <option value="">Selecciona una especialidad</option>
                    {specialties.map((spec) => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={handleAddUser} disabled={addingUser || currentUsers >= maxUsers}>
                  <Plus size={16} className="mr-2" />
                  {addingUser ? 'Agregando...' : 'Agregar Usuario'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} disabled={currentUsers >= maxUsers} className="mb-6">
            <Plus size={16} className="mr-2" />
            Agregar Usuario
          </Button>
        )}

        {/* Lista de usuarios */}
        <div className="space-y-4">
          {tenantUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No hay usuarios agregados</p>
              </CardContent>
            </Card>
          ) : (
            tenantUsers.map((tenantUser) => (
              <Card key={tenantUser.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#003366]">
                        {tenantUser.user?.full_name || tenantUser.user?.email || 'Usuario'}
                      </p>
                      <p className="text-sm text-slate-600">{tenantUser.user?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tenantUser.role === 'business_owner'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                          }`}>
                          {tenantUser.role === 'business_owner' ? 'Admin' : 'Especialista'}
                        </span>
                        {tenantUser.specialty && (
                          <span className="text-xs text-slate-500">
                            • {tenantUser.specialty.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {tenantUser.user_id !== user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveUser(tenantUser.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
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
