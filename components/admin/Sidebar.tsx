'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
    Power, X, LogOut, ClipboardList, User, Users,
    Settings, Star, Building2, Menu, Calendar, MessageSquare, BarChart3
} from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import NotificationBell from '@/components/shared/NotificationBell'

export function Sidebar() {
    const pathname = usePathname()
    const { user, isBusinessOwner, logout } = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isActive = (path: string) => pathname === path

    const menuItems = [
        {
            group: 'Principal',
            items: [
                {
                    href: '/admin/dashboard',
                    label: 'Reservas',
                    icon: ClipboardList
                }
            ]
        },
        {
            group: 'Gestión',
            items: [
                {
                    href: '/admin/especialidades',
                    label: 'Especialidades',
                    icon: Star
                },
                {
                    href: '/admin/especialistas',
                    label: 'Especialistas',
                    icon: Users
                },
                {
                    href: '/admin/disponibilidad',
                    label: 'Disponibilidad',
                    icon: Calendar
                },
                {
                    href: '/admin/reviews',
                    label: 'Reviews',
                    icon: MessageSquare
                },
                {
                    href: '/admin/analytics',
                    label: 'Analytics',
                    icon: BarChart3
                },
                {
                    href: '/admin/configuracion',
                    label: 'Configuración',
                    icon: Settings
                },
                {
                    href: '/admin/usuarios',
                    label: 'Usuarios',
                    icon: User // Or another icon if available
                }
            ]
        }
    ]

    return (
        <>
            {/* Mobile Toggle Button (Fixed on screen when sidebar is closed) */}
            <button
                onClick={() => setMobileMenuOpen(true)}
                className="fixed top-4 left-4 z-40 md:hidden text-[#003366] bg-white p-2 rounded-md shadow-sm"
            >
                <Menu size={24} />
            </button>

            {/* Mobile Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#003366] text-white p-6 flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0 shadow-2xl md:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Header */}
                <div className="mb-10 w-full">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Logo dark={true} />
                            <span className="text-xs opacity-50 font-normal mt-1 self-end mb-1 ml-1">Negocio</span>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="md:hidden text-blue-200"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    {/* Notification Bell */}
                    <div className="mt-4">
                        <NotificationBell />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-4 flex-1 overflow-y-auto">
                    {menuItems.map((group, groupIndex) => (
                        <div key={groupIndex}>
                            {group.group && (
                                <div className="text-xs font-bold text-blue-300 uppercase tracking-widest px-3 mb-2 pt-2">
                                    {group.group}
                                </div>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const active = isActive(item.href)
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`
                        w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-medium
                        ${active
                                                    ? 'bg-[#00A896] text-white font-bold shadow-lg shadow-teal-900/20'
                                                    : 'text-blue-100 hover:bg-white/10'
                                                }
                      `}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <item.icon size={20} />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / User Info */}
                <div className="mt-auto border-t border-blue-900 pt-6">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                            {user?.email?.[0] || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate max-w-[120px]" title={user?.email || ''}>
                                {user?.email}
                            </p>
                            <p className="text-xs text-blue-300 capitalize">
                                {isBusinessOwner ? 'Propietario' : 'Especialista'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-blue-200 hover:text-white w-full px-2 text-sm transition-colors"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    )
}
