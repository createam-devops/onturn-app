/**
 * MANIFEST INJECTOR
 * Cliente component que inyecta el manifest correspondiente en el <head>
 */

'use client'

import { useEffect } from 'react'

interface ManifestInjectorProps {
  manifestPath: '/manifest-customer.json' | '/manifest-business.json' | '/manifest-superadmin.json'
}

export function ManifestInjector({ manifestPath }: ManifestInjectorProps) {
  useEffect(() => {
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    
    if (manifestLink) {
      manifestLink.href = manifestPath
    } else {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.href = manifestPath
      document.head.appendChild(manifestLink)
    }

    // Cleanup al desmontar
    return () => {
      const link = document.querySelector('link[rel="manifest"]')
      if (link) {
        link.remove()
      }
    }
  }, [manifestPath])

  return null
}
