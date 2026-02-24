'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Actualizar manifest para PWA Business
    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
        if (manifestLink) {
            manifestLink.href = '/manifest-business.json'
        }
    }, [])

    // No mostrar sidebar en login pagina
    if (pathname === '/admin/login') {
        return (
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-slate-100 overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden relative w-full">
                    {children}
                </div>
            </div>
        </ErrorBoundary>
    )
}
