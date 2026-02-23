/**
 * PWA PROVIDER
 * Inicializa Service Worker y funcionalidad PWA
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { registerServiceWorker, initPWAInstallPrompt, getManifestForContext, getPWAContext } from '@/lib/pwa-utils'
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt'

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pwaContext = getPWAContext(pathname)

  useEffect(() => {
    // Registrar Service Worker
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_PWA === 'true') {
      registerServiceWorker()
    }

    // Inicializar prompt de instalación
    initPWAInstallPrompt()

    // Actualizar manifest link tag dinámicamente
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      manifestLink.setAttribute('href', getManifestForContext(pwaContext))
    } else {
      // Crear link si no existe
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = getManifestForContext(pwaContext)
      document.head.appendChild(link)
    }

    // Actualizar theme-color según contexto
    const themeColor = {
      'super-admin': '#6d28d9',
      business: '#0f172a',
      customer: '#3b82f6',
    }[pwaContext]

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = themeColor
      document.head.appendChild(meta)
    }

    // Detectar si está en modo standalone (PWA instalada)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] Running in standalone mode')
      document.body.classList.add('pwa-standalone')
    }
  }, [pwaContext])

  return (
    <>
      {children}
      <PWAInstallPrompt context={pwaContext} />
    </>
  )
}
