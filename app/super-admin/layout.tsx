'use client'

import { useEffect } from 'react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    // Actualizar manifest para PWA SuperAdmin
    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
        if (manifestLink) {
            manifestLink.href = '/manifest-superadmin.json'
        }
    }, [])

    return (
        <div className="min-h-screen bg-slate-100">
            {children}
        </div>
    )
}
