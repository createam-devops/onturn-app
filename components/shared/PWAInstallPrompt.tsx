/**
 * PWA INSTALL PROMPT COMPONENT
 * Muestra un banner para instalar la PWA
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, ExternalLink } from 'lucide-react'
import { promptPWAInstall, isPWAInstalled, getPWAContext } from '@/lib/pwa-utils'
import { usePathname } from 'next/navigation'

interface PWAInstallPromptProps {
  context?: 'super-admin' | 'business' | 'customer'
}

export default function PWAInstallPrompt({ context }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [wasInstalled, setWasInstalled] = useState(false)
  const pathname = usePathname()

  const pwaContext = context || getPWAContext(pathname)

  useEffect(() => {
    // No mostrar si ya está en modo standalone (usando la PWA)
    if (isPWAInstalled()) {
      return
    }

    // Verificar si ya fue instalada anteriormente
    const installKey = `pwa-installed-${pwaContext}`
    const previouslyInstalled = localStorage.getItem(installKey) === 'true'
    setWasInstalled(previouslyInstalled)

    // NO mostrar en landing page
    if (pathname === '/' || pathname.startsWith('/[slug]')) {
      return
    }

    // Solo mostrar en rutas específicas según contexto
    const shouldShowInRoute = {
      'customer': pathname.startsWith('/reservas') || pathname.startsWith('/mis-reservas'),
      'business': pathname.startsWith('/admin'),
      'super-admin': pathname.startsWith('/super-admin'),
    }[pwaContext]

    if (!shouldShowInRoute) {
      return
    }

    // Escuchar evento de disponibilidad
    const handleInstallAvailable = () => {
      // Esperar 5 segundos antes de mostrar
      setTimeout(() => {
        setShowPrompt(true)
      }, 5000)
    }

    const handleInstalled = () => {
      setShowPrompt(false)
    }

    window.addEventListener('pwa-install-available', handleInstallAvailable)
    window.addEventListener('pwa-installed', handleInstalled)

    // Verificar si ya está disponible
    setTimeout(() => {
      if (!isPWAInstalled() && !sessionStorage.getItem(`pwa-prompt-dismissed-${pwaContext}`)) {
        setShowPrompt(true)
      }
    }, 10000)

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable)
      window.removeEventListener('pwa-installed', handleInstalled)
    }
  }, [pathname, pwaContext])

  const handleInstall = async () => {
    if (wasInstalled) {
      // Si ya estaba instalada, intentar abrirla (navegar con intent)
      // No hay forma directa de abrir la PWA, así que simplemente mostramos mensaje
      alert('La app ya está instalada en tu dispositivo. Búscala en tu pantalla de inicio.')
      handleDismiss()
      return
    }

    setIsInstalling(true)

    try {
      const accepted = await promptPWAInstall()

      if (accepted) {
        // Guardar que se instaló
        localStorage.setItem(`pwa-installed-${pwaContext}`, 'true')
        setShowPrompt(false)
      } else {
        setIsInstalling(false)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem(`pwa-prompt-dismissed-${pwaContext}`, 'true')
  }

  if (!showPrompt) return null

  const appNames = {
    'super-admin': 'OnTurn SuperAdmin',
    business: 'OnTurn Business',
    customer: 'OnTurn',
  }

  const descriptions = {
    'super-admin': wasInstalled ? 'Abre la app desde tu pantalla de inicio' : 'Gestiona todo el sistema desde tu dispositivo',
    business: wasInstalled ? 'Abre la app desde tu pantalla de inicio' : 'Gestiona tu negocio desde cualquier lugar',
    customer: wasInstalled ? 'Abre la app desde tu pantalla de inicio' : 'Reserva servicios más rápido y sin conexión',
  }

  const actionLabels = {
    'super-admin': wasInstalled ? 'Ya Instalada' : 'Instalar',
    business: wasInstalled ? 'Ya Instalada' : 'Instalar',
    customer: wasInstalled ? 'Ya Instalada' : 'Instalar',
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 flex items-center gap-4">
          {/* Icono */}
          <div className="hidden sm:flex flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center">
            <Smartphone className="h-8 w-8 text-white" />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">
              {wasInstalled ? appNames[pwaContext] : `Instalar ${appNames[pwaContext]}`}
            </h3>
            <p className="text-sm text-blue-100 line-clamp-2">
              {descriptions[pwaContext]}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-white hover:bg-blue-50 text-blue-700 font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {wasInstalled ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isInstalling ? 'Instalando...' : actionLabels[pwaContext]}
              </span>
            </button>

            <button
              onClick={handleDismiss}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progreso de instalación */}
        {isInstalling && (
          <div className="h-1 bg-white/20">
            <div className="h-full bg-white animate-pulse w-full"></div>
          </div>
        )}
      </div>
    </div>
  )
}
