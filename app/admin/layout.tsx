'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ManifestInjector } from '@/components/shared/ManifestInjector'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // No mostrar sidebar en login pagina
    if (pathname === '/admin/login') {
        return (
            <ErrorBoundary>
                <ManifestInjector manifestPath="/manifest-business.json" />
                {children}
            </ErrorBoundary>
        )
    }

    return (
        <ErrorBoundary>
            <ManifestInjector manifestPath="/manifest-business.json" />
            <div className="flex h-screen bg-slate-100 overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden relative w-full">
                    {children}
                </div>
            </div>
        </ErrorBoundary>
    )
}
