'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { getProfile, updateProfile, updatePassword } from '@/lib/services/profile'
import { perfilSchema, cambioPasswordSchema } from '@/lib/schemas'
import { PublicHeader } from '@/components/public/PublicHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { User, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types/user'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const { success, error: showError } = useToast()
    const supabase = createClient()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Controlled state for Tabs
    const [activeTab, setActiveTab] = useState('personal')

    // Form states
    const [formData, setFormData] = useState({
        full_name: '',
        phone: ''
    })

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    })

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login?redirect=/perfil')
            return
        }

        if (user?.id) {
            loadProfile()
        }
    }, [user, isAuthenticated, authLoading])

    const loadProfile = async () => {
        if (!user?.id) return
        try {
            setLoading(true)
            const data = await getProfile(user.id)
            // If data is null (profile missing), we just leave empty fields for new creation
            if (data) {
                setProfile(data)
                setFormData({
                    full_name: data.full_name || '',
                    phone: data.phone || ''
                })
            }
        } catch (error) {
            console.error('Error al cargar perfil:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id) return

        setSaving(true)
        setMessage(null)

        // Validar con Zod
        const validation = perfilSchema.safeParse(formData)
        if (!validation.success) {
            const firstError = validation.error.errors[0]
            setMessage({ type: 'error', text: firstError.message })
            setSaving(false)
            return
        }

        try {
            const updated = await updateProfile(user.id, {
                full_name: formData.full_name,
                phone: formData.phone
            })
            setProfile(updated)
            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Error al actualizar el perfil' })
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)

        // Validar con Zod
        const validation = cambioPasswordSchema.safeParse(passwordData)
        if (!validation.success) {
            const firstError = validation.error.errors[0]
            setMessage({ type: 'error', text: firstError.message })
            return
        }

        setSaving(true)

        try {
            await updatePassword(passwordData.newPassword)
            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
            setPasswordData({ newPassword: '', confirmPassword: '' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al actualizar la contraseña' })
        } finally {
            setSaving(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-600">Cargando perfil...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <PublicHeader backLink="/mis-reservas" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[500px]">
                    <div className="p-6 md:p-8">
                        <div className="mb-8 border-b border-slate-100 pb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-[#003366] mb-2">Mi Perfil</h1>
                                <p className="text-slate-500">Administra tus datos personales y seguridad</p>
                            </div>
                            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-[#003366]">
                                <User size={24} />
                            </div>
                        </div>

                        {message && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <p className="font-medium">{message.text}</p>
                            </div>
                        )}

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto inline-flex mb-8">
                                <TabsTrigger value="personal" className="flex-1 sm:flex-none rounded-lg px-6 py-2.5 font-medium data-[state=active]:bg-white data-[state=active]:text-[#00A896] data-[state=active]:shadow-sm flex items-center gap-2 justify-center">
                                    <User size={18} /> Datos Personales
                                </TabsTrigger>
                                <TabsTrigger value="security" className="flex-1 sm:flex-none rounded-lg px-6 py-2.5 font-medium data-[state=active]:bg-white data-[state=active]:text-[#003366] data-[state=active]:shadow-sm flex items-center gap-2 justify-center">
                                    <Lock size={18} /> Seguridad
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal">
                                <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-lg">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Email</label>
                                        <Input
                                            value={user?.email || ''}
                                            disabled
                                            className="bg-slate-50 text-slate-500 border-slate-200"
                                        />
                                        <p className="text-xs text-slate-400">El email no se puede cambiar</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                                        <Input
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="Ej: Juan Pérez"
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Teléfono</label>
                                        <Input
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+51 999 999 999"
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Foto de Perfil</label>
                                        <ImageUpload
                                            currentImageUrl={profile?.avatar_url}
                                            onImageUploaded={async (url) => {
                                                if (!user?.id) return
                                                const { error } = await supabase
                                                    .from('profiles')
                                                    .update({ avatar_url: url })
                                                    .eq('id', user.id)
                                                
                                                if (!error) {
                                                    setProfile(prev => prev ? { ...prev, avatar_url: url } : null)
                                                    success('Foto de perfil actualizada exitosamente')
                                                } else {
                                                    showError('Error al actualizar la foto de perfil')
                                                }
                                            }}
                                            bucket="avatars"
                                            folder={user?.id}
                                            maxSizeInMB={2}
                                            previewSize="md"
                                            shape="circle"
                                            buttonText="Cambiar foto"
                                            compressionType="avatar"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-[#00A896] hover:bg-[#008f80] h-12 px-8 text-base">
                                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            <TabsContent value="security">
                                <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-lg">
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl mb-6">
                                        <h4 className="font-bold text-orange-800 mb-1 flex items-center gap-2">
                                            <Lock size={16} /> Cambiar Contraseña
                                        </h4>
                                        <p className="text-sm text-orange-700">
                                            Asegúrate de usar una contraseña segura que no uses en otros sitios.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
                                        <Input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            placeholder="Mínimo 6 caracteres"
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Confirmar Nueva Contraseña</label>
                                        <Input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            placeholder="Repite la contraseña"
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" disabled={saving} variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 text-base">
                                            {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    )
}
