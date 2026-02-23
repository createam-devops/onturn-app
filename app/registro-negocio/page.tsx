'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAllCategories } from '@/lib/services/businesses'
import { registroNegocioSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Lock, Power, Building2, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import type { Category } from '@/types/business'
import { getErrorMessage } from '@/lib/utils/errorHandler'

export default function RegistroNegocioPage() {
  const router = useRouter()
  const supabase = createClient()

  // Datos del solicitante
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // Datos del negocio
  const [businessName, setBusinessName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [businessCategoryId, setBusinessCategoryId] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessState, setBusinessState] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userExists, setUserExists] = useState(false) // Nuevo estado para usuario existente

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await getAllCategories()
      setCategories(data || [])
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'LOAD_CATEGORIES')
      console.error('[REGISTRO] Error al cargar categorías:', errorMessage)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevenir propagación de eventos
    e.stopPropagation()
    
    // Reset de estados
    setLoading(true)
    setError('')
    setSuccess(false)
    setUserExists(false)

    // Validar con Zod ANTES de cualquier operación
    const validation = registroNegocioSchema.safeParse({
      applicantName: fullName,
      applicantEmail: email,
      password,
      businessName,
      businessDescription: businessDescription || undefined,
      businessCategoryId: businessCategoryId || undefined,
      businessAddress,
      businessCity,
      businessState,
      businessPhone,
      businessEmail: businessEmail || undefined
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      setError(firstError.message)
      setLoading(false)
      return
    }

    // Envolver TODO en try-catch super defensivo
    try {
      console.log('[REGISTRO] Iniciando registro...', { email, passwordLength: password.length })
      
      // 1. Crear usuario en auth (Supabase envía email de confirmación automáticamente)
      let authData, authError
      
      try {
        const response = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`,
            data: {
              full_name: fullName,
              role: 'business_owner',
            }
          }
        })
        authData = response.data
        authError = response.error
      } catch (signUpException: any) {
        console.error('[REGISTRO] Excepción en signUp:', signUpException)
        setError('Error de conexión al registrarse. Por favor intenta nuevamente.')
        setLoading(false)
        return
      }

      console.log('[REGISTRO] Respuesta de signUp:', { 
        hasUser: !!authData?.user, 
        errorExists: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status
      })

      // CRÍTICO: Si hay error, manejarlo ANTES de continuar
      if (authError) {
        console.error('[REGISTRO] Error en signUp:', authError)
        
        // Usuario ya existe - Supabase puede devolver esto de varias formas
        const errorMsg = (authError.message || '').toLowerCase()
        const errorCode = authError.status
        
        // Error 422: Usually means user already exists or validation failed
        if (errorCode === 422 || 
            errorMsg.includes('already') || 
            errorMsg.includes('registered') ||
            errorMsg.includes('user already exists') ||
            errorMsg.includes('duplicate') ||
            errorMsg.includes('email address already')) {
          console.log('[REGISTRO] Usuario ya existe detectado')
          
          // Batch state updates to avoid multiple re-renders
          setTimeout(() => {
            setUserExists(true)
            setError('⚠️ Este email ya está registrado en nuestra plataforma.')
            setLoading(false)
          }, 0)
          
          return
        }
        
        // Email inválido
        if (errorMsg.includes('invalid') || errorMsg.includes('email format')) {
          setError('❌ El email ingresado no es válido. Por favor verifica el formato.')
          setLoading(false)
          return
        }
        
        // Contraseña débil
        if (errorMsg.includes('password') || errorMsg.includes('weak') || errorMsg.includes('strong')) {
          setError('🔑 La contraseña debe tener al menos 6 caracteres.')
          setLoading(false)
          return
        }
        
        // Sign ups deshabilitados
        if (errorMsg.includes('signup') || errorMsg.includes('disabled')) {
          setError('⛔ Los registros están temporalmente deshabilitados. Contacta a soporte.')
          setLoading(false)
          return
        }
        
        // Error genérico con mensaje completo de Supabase para debugging
        console.error('[REGISTRO] Error completo:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          code: (authError as any).code
        })
        
        setError(`Error: ${authError.message || 'Error desconocido'}. Si el problema persiste, contacta a soporte.`)
        setLoading(false)
        return
      }

      // CRÍTICO: Verificar que tenemos un usuario válido
      if (!authData || !authData.user) {
        console.error('[REGISTRO] No se recibió usuario en la respuesta')
        setError('Error: No se pudo crear el usuario. Por favor intenta nuevamente.')
        setLoading(false)
        return
      }

      console.log('[REGISTRO] Usuario creado:', authData.user.id)

      // 2. Esperar a que el trigger de base de datos cree el perfil automáticamente
      // El trigger on_auth_user_created crea el perfil inmediatamente
      console.log('[REGISTRO] Esperando a que el trigger cree el perfil...')
      await new Promise(resolve => setTimeout(resolve, 500))

      // 3. Generar slug único para el negocio
      const baseSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      
      const timestamp = Date.now()
      const slug = `${baseSlug}-${timestamp.toString().slice(-6)}`

      // 4. Crear negocio INMEDIATAMENTE (con acceso limitado hasta confirmación de email)
      console.log('[REGISTRO] Intentando crear negocio...')
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_id: authData.user.id,
          name: businessName,
          slug: slug,
          description: businessDescription,
          category_id: businessCategoryId || null,
          address: businessAddress,
          city: businessCity,
          state: businessState,
          phone: businessPhone,
          email: businessEmail || email,
          auto_confirm: false,
          is_active: true,
          // Sistema de aprobación
          approval_status: 'pending',
          is_publicly_visible: false,
          can_receive_bookings: false, // Se activa al confirmar email
          // Plan gratuito inicial
          plan_type: 'free',
          max_specialists: 1,
          max_receptionists: 0,
          max_users: 1,
        })
        .select()
        .single()

      if (businessError) {
        console.error('[REGISTRO] Error al crear negocio:', businessError)
        setError(`Error al crear negocio: ${businessError.message}`)
        setLoading(false)
        return
      }

      console.log('[REGISTRO] Negocio creado exitosamente:', businessData.id)

      // 5. Crear solicitud de registro para que el admin la revise
      console.log('[REGISTRO] Creando solicitud de registro...')
      const { error: requestError } = await supabase
        .from('tenant_registration_requests')
        .insert({
          applicant_email: email,
          applicant_name: fullName,
          applicant_user_id: authData.user.id,
          business_name: businessName,
          business_description: businessDescription,
          business_category_id: businessCategoryId || null,
          business_address: businessAddress,
          business_city: businessCity,
          business_state: businessState,
          business_phone: businessPhone,
          business_email: businessEmail || email,
          status: 'pending',
        })

      if (requestError) {
        console.error('[REGISTRO] Error al crear solicitud (no crítico):', requestError)
        // No bloquear registro si falla la solicitud  
      } else {
        console.log('[REGISTRO] Solicitud creada exitosamente')
      }

      console.log('[REGISTRO] ✅ Registro completado exitosamente')

      // 6. NO cerrar sesión → Usuario queda logueado y va directo al dashboard
      setSuccess(true)
      setLoading(false)

      // Mostrar mensaje de éxito breve y redirigir al dashboard
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
    } catch (err: any) {
      // CAPTURA ABSOLUTA de cualquier error
      console.error('[REGISTRO] Error CATCH global:', err)
      console.error('[REGISTRO] Stack:', err?.stack)
      
      // Determinar mensaje apropiado
      let errorMessage = 'Error inesperado al registrarse.'
      
      if (err?.message) {
        // Si el error menciona "duplicate" o "already", es usuario existente
        const errMsg = err.message.toLowerCase()
        if (errMsg.includes('duplicate') || 
            errMsg.includes('already') || 
            errMsg.includes('unique')) {
          errorMessage = '⚠️ Este email ya está registrado en nuestra plataforma.'
          setUserExists(true)
        } else {
          errorMessage = `Error: ${err.message}`
        }
      }
      
      setError(errorMessage)
      setLoading(false)
      setSuccess(false)
    } finally {
      // Asegurar que siempre se limpia el estado de loading
      if (loading) {
        console.log('[REGISTRO] Limpiando estado de loading en finally')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-900/20">
            <Power size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#003366]">
            Solicitar Registro de Establecimiento
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Completa el formulario para solicitar el registro de tu establecimiento
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 space-y-2">
            <p className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              ✅ ¡Cuenta creada! Accediendo al dashboard...
            </p>
            <div className="text-xs space-y-1 pl-7">
              <p>🎉 <strong>Ya puedes empezar a configurar tu negocio</strong></p>
              <p>📧 Revisa tu email y confirma para activar las reservas</p>
              <p className="text-green-600 font-semibold mt-2">Redirigiendo...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Banner especial cuando el usuario ya existe */}
          {userExists && (
            <div className="bg-orange-50 border-2 border-orange-300 text-orange-900 px-5 py-4 rounded-xl text-sm space-y-3">
              <p className="font-bold flex items-center gap-2 text-base">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                ⚠️ Este email ya está registrado
              </p>
              <div className="space-y-2 pl-8 text-sm">
                <p>El email <strong>{email}</strong> ya tiene una cuenta en OnTurn.</p>
                <p className="font-semibold">¿Qué puedes hacer?</p>
                <div className="flex flex-col gap-2 mt-3">
                  <Link 
                    href="/admin/login" 
                    className="bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#004488] transition-colors text-center font-medium"
                  >
                    🔐 Iniciar Sesión
                  </Link>
                  <Link 
                    href="/admin/login?forgot=true" 
                    className="bg-orange-200 text-orange-900 px-4 py-2 rounded-lg hover:bg-orange-300 transition-colors text-center font-medium"
                  >
                    🔑 ¿Olvidaste tu contraseña?
                  </Link>
                  <button 
                    type="button"
                    onClick={() => {
                      setUserExists(false)
                      setError('')
                      setEmail('')
                    }}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
                  >
                    📧 Usar otro email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Banner de error general */}
          {error && !userExists && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Sección: Datos del Solicitante */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-lg font-bold text-[#003366] mb-4">Datos del Solicitante</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <User size={20} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-transparent outline-none w-full text-[#003366]"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <Mail size={20} className="text-slate-400" />
                <input
                  type="email"
                  placeholder="Correo Electrónico"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent outline-none w-full text-[#003366]"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3 md:col-span-2">
                <Lock size={20} className="text-slate-400" />
                <input
                  type="password"
                  placeholder="Contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="bg-transparent outline-none w-full text-[#003366]"
                />
              </div>
            </div>
          </div>

          {/* Sección: Datos del Establecimiento */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-lg font-bold text-[#003366] mb-4">Datos del Establecimiento</h3>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <Building2 size={20} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Nombre del Establecimiento"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-transparent outline-none w-full text-[#003366]"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <textarea
                  placeholder="Descripción del establecimiento"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  rows={3}
                  className="bg-transparent outline-none w-full text-[#003366] resize-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <select
                  value={businessCategoryId}
                  onChange={(e) => setBusinessCategoryId(e.target.value)}
                  className="bg-transparent outline-none w-full text-[#003366]"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <MapPin size={20} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="bg-transparent outline-none w-full text-[#003366]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                    className="bg-transparent outline-none w-full text-[#003366]"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Estado/Provincia"
                    value={businessState}
                    onChange={(e) => setBusinessState(e.target.value)}
                    className="bg-transparent outline-none w-full text-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                  <Phone size={20} className="text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Teléfono del establecimiento"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="bg-transparent outline-none w-full text-[#003366]"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                  <Mail size={20} className="text-slate-400" />
                  <input
                    type="email"
                    placeholder="Email del establecimiento (opcional)"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="bg-transparent outline-none w-full text-[#003366]"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || success} variant="default">
            {loading ? 'Enviando solicitud...' : success ? 'Solicitud enviada' : 'Enviar Solicitud'}
          </Button>

          <div className="text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/admin/login"
              className="text-[#003366] font-bold hover:underline"
            >
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
