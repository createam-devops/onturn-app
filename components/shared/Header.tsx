'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, UserCircle, Briefcase, Menu, ChevronLeft, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'
import { cn } from '@/lib/utils'
import { UpcomingAppointments } from '@/components/reservas/UpcomingAppointments'
import NotificationBell from '@/components/shared/NotificationBell'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userType, isAuthenticated, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  // Detect PWA standalone mode
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      setIsStandalone(standalone)
    }
    checkStandalone()
  }, [])

  // Handle scroll effect for transparent header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // --- Logic to determine Header State ---

  // 1. Exclude from Admin Dashboard
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/super-admin')) {
    return null
  }

  // State for User Menu Dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Determine Context (Background underneath)
  const isDarkContext = useMemo(() => {
    if (!pathname) return false

    // 1. Explicitly Dark Context Routes (White Text initially)
    const darkRoutes = ['/reservas', '/mis-reservas', '/perfil']
    if (darkRoutes.some(route => pathname.startsWith(route))) {
      if (pathname === '/reservas/confirmation') return false
      return true
    }

    // 2. Dynamic Routes: Business Slug (/[slug]) & Booking (/[slug]/reservar)
    // We assume mostly everything else is "Dark Context" (Hero) unless it's a known "Light" route.
    const knownLightRoutes = ['/login', '/registro', '/registro-negocio', '/admin', '/super-admin', '/api', '/_next', '/favicon.ico', '/']
    const isLight = knownLightRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

    // Landing page is usually light or has its own header, but here we treat '/' as light context in global header logic.
    if (pathname === '/') return false

    if (!isLight) {
      // Simple heuristic: If it's not a known light route, and not admin, assume it's a public page with a hero (Business Detail)
      return true
    }

    return false
  }, [pathname])

  let showSearch = false
  let showBack = true

  if (pathname === '/') {
    showBack = false
  } else if (pathname?.startsWith('/reservas') && pathname !== '/reservas/confirmation') {
    showSearch = true
  }

  // --- Dynamic Styles ---

  // Header Background: Always Transparent initially, White/Glass on Scroll
  const headerClass = cn(
    "fixed w-full z-50 transition-all duration-300 border-b",
    {
      "bg-transparent border-transparent": !scrolled,
      "bg-white/70 backdrop-blur-xl border-slate-200/60 shadow-sm": scrolled,
    }
  )

  // Text/Icon Colors
  // If we are in a Dark Context (Reservas) AND NOT Scrolled -> White Text
  // Otherwise (Light Context OR Scrolled) -> Dark Text
  const isTextWhite = isDarkContext && !scrolled
  const textColorClass = isTextWhite ? "text-white" : "text-slate-800"

  // Logo Logic: "dark={true}" means White Text. 
  // We want White Text if isTextWhite is true.
  const logoDark = isTextWhite

  // Back Button / Search Icon specific overrides
  const iconClass = isTextWhite ? "text-white hover:bg-white/10" : "text-slate-800 hover:bg-black/5"

  return (
    <header className={headerClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">

          {/* LEFT SECTION: Logo & Back */}
          <div className="flex items-center gap-4">
            {showBack && (
              <button
                onClick={() => router.back()}
                className={cn(
                  "flex items-center justify-center transition-colors text-white/80 hover:text-white -ml-2",
                  !isTextWhite && "text-slate-800 hover:text-slate-600"
                )}
              >
                <ChevronLeft size={28} strokeWidth={2.5} />
              </button>
            )}

            {/* Logo - No clickable en PWA standalone, solo mostrar branding */}
            {isStandalone ? (
              <div className="flex items-center">
                <Logo dark={logoDark} />
              </div>
            ) : (
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Logo dark={logoDark} />
              </Link>
            )}
          </div>

          {/* CENTER SECTION: Search Bar */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full h-10">
                <div className={cn(
                  "h-10 px-4 rounded-full flex items-center gap-3 w-full transition-all focus-within:ring-4 shadow-sm group",
                  isTextWhite && !scrolled ? "bg-white/95 backdrop-blur-sm focus-within:ring-[#00A896]/20 shadow-lg" : "bg-slate-100 focus-within:ring-slate-200"
                )}>
                  <Search size={18} className={cn("text-[#00A896]", !isTextWhite && "text-slate-400")} />
                  <input
                    type="text"
                    placeholder="Busca servicios, negocios..."
                    className={cn(
                      "w-full bg-transparent outline-none text-sm font-medium",
                      isTextWhite && !scrolled ? "text-slate-700 placeholder:text-slate-400" : "text-slate-900 placeholder:text-slate-500"
                    )}
                    defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = e.currentTarget.value
                        const params = new URLSearchParams(window.location.search)
                        if (value) {
                          params.set('q', value)
                        } else {
                          params.delete('q')
                        }
                        router.push(`/reservas?${params.toString()}`)
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* RIGHT SECTION: User State & Actions */}
          <div className="flex items-center gap-4">
            {/* If Authed, or if inner page unauthed */}

            {isAuthenticated ? (
              // LOGGED IN STATE
              <div className="flex items-center gap-3">
                {userType === 'customer' && <UpcomingAppointments />}
                
                {/* Notificaciones */}
                <NotificationBell />

                {/* Landing Specific Button: Ofrecer Servicios (NO en PWA standalone) */}
                {pathname === '/' && userType !== 'business_owner' && !isStandalone && (
                  <Link href="/registro-negocio">
                    <Button variant="default" className="rounded-full shadow-md hover:shadow-lg transition-all gap-2 bg-[#00A896] hover:bg-[#008f80] text-white border-transparent px-4 mr-2">
                      <Briefcase size={18} />
                      <span>Soy Negocio</span>
                    </Button>
                  </Link>
                )}

                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className={cn("text-[10px] uppercase font-bold opacity-70", textColorClass)}>Hola,</span>
                  <span className={cn("text-sm font-bold truncate max-w-[120px]", textColorClass)}>
                    {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario'}
                  </span>
                </div>

                {/* User Dropdown Menu (Hover + Click Compatible) */}
                <div
                  className="relative"
                  ref={menuRef}
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="h-9 w-9 bg-[#00A896] rounded-full flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:scale-105 transition-transform"
                  >
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>

                  {/* Dropdown Content */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 transition-all duration-200 transform origin-top-right z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                      <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.user_metadata?.full_name || 'Usuario'}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1 tracking-wider">{userType?.replace('_', ' ') || 'Invitado'}</p>
                      </div>

                      <div className="py-1">
                        {/* BUSINESS OWNER MENU */}
                        {userType === 'business_owner' ? (
                          <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Briefcase size={18} className="text-slate-400" />
                            Panel de Control
                          </Link>
                        ) : (
                          /* CUSTOMER MENU */
                          <>
                            <Link
                              href="/reservas"
                              className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-[#00A896] bg-teal-50/50 hover:bg-teal-50 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Search size={18} className="text-[#00A896]" />
                              Reservar Turno
                            </Link>

                            <Link
                              href="/mis-reservas"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Briefcase size={18} className="text-slate-400" />
                              Mis Reservas
                            </Link>

                            <Link
                              href="/perfil"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <UserCircle size={18} className="text-slate-400" />
                              Mi Perfil
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-slate-100 mt-1 pt-1 bg-slate-50/30">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            logout()
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                        >
                          <LogOut size={18} />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // NOT LOGGED IN STATE
              <div className="flex items-center gap-3">
                {/* Landing Specific Button: Ofrecer Servicios (NO en PWA standalone) */}
                {pathname === '/' && !isStandalone && (
                  <Link href="/registro-negocio">
                    <Button variant="default" className="rounded-full shadow-md hover:shadow-lg transition-all gap-2 bg-[#00A896] hover:bg-[#008f80] text-white border-transparent px-4 mr-2">
                      <Briefcase size={18} />
                      <span>Soy Negocio</span>
                    </Button>
                  </Link>
                )}

                {/* Universal Login Trigger Block: "Hola! Bienvenido" */}
                <Link href="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
                  <div className="hidden md:flex flex-col items-end leading-tight">
                    <span className={cn("text-[10px] uppercase font-bold tracking-wider", isTextWhite ? "text-[#00A896]" : "text-[#00A896]")}>HOLA!</span>
                    <span className={cn("text-sm font-bold", textColorClass)}>Bienvenido</span>
                  </div>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-transparent group-hover:border-white/20",
                    isTextWhite
                      ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      : "bg-slate-100/50 text-slate-600 border-slate-200"
                  )}>
                    <User size={20} strokeWidth={2.5} />
                  </div>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header >
  )
}
